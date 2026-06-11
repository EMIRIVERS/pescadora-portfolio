# RBAC Plan — P1 (Roles & Permissions for XICO Films admin)

Status: PLAN ONLY. No source code is modified by this document. This file specifies the
migration, the authz helpers, the proxy/server-action gating, and the minimal UI changes
required to ship role-based access control inside `app/(admin)/*`.

---

## 1. Today's state (verified in repo)

- `profiles.is_admin_team boolean NOT NULL DEFAULT false` — the only real gate. Everything
  in `/admin` is "all-or-nothing": if `is_admin_team` is true you can do everything.
- `profiles.role` is a Postgres **enum** `user_role` = `('admin_staff', 'client')` (defined in
  `20260329000000_pescadora_platform.sql:9`, column at line 21). It is **not** a `CHECK`
  constraint — the task brief's `profiles_role_check` name does not exist in the tracked
  migrations; treat `user_role` enum as the source of truth.
- `profiles.display_role text` exists (`20260416000001`) — free-text cosmetic label, unrelated
  to authz. Keep it for the "job title" shown in the team UI; do **not** overload it for RBAC.
- All RLS policies gate staff via either an inline
  `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin_team = true)` or a
  `SECURITY DEFINER` helper `is_admin_team()` (referenced in `20260416000001`; its `CREATE
  FUNCTION` body lives in the reconciled drift, not in a tracked migration file).
- `requireAdmin()` (`src/lib/supabase/server.ts`) checks only `is_admin_team`.
- `proxy.ts` checks only `is_admin_team` for `/admin`.
- The `/admin/team` page already reads `role` and has a concept of "admin roles"
  (`const ADMIN_ROLES = new Set(['admin', 'admin_staff'])`).

**Design constraint that follows from this:** `is_admin_team` stays as the *coarse* "is this
person staff (vs. a client)" boolean and the RLS backbone. RBAC layers a *fine-grained role*
on top of it. We do **not** rip out `is_admin_team`; every staff role keeps it `true`.

---

## 2. Roles (production house)

Six staff roles plus the existing client role. `staff_role` is `NULL` for clients.

| Role key        | Spanish label (UI) | Who                                  |
|-----------------|--------------------|--------------------------------------|
| `owner`         | Dirección          | Founder/director. Full control incl. team & billing config. |
| `producer`      | Productor          | Runs projects, leads, calendar, proposals; sees finance read-only. |
| `finance`       | Finanzas           | Owns invoices/expenses/CFDI; read-only on production. |
| `editor`        | Editor / Post      | Works deliverables, tasks, media, portfolio. No finance, no team. |
| `assistant`     | Asistente          | Low-trust: read most things, edit calendar/tasks, no delete, no finance, no team. |
| `client`        | Cliente            | (existing) portal only, never `/admin`. |

Notes:
- `owner` is the only role that can manage team membership/roles and edit billing/fiscal
  config. There must always be at least one `owner` (enforced in the `updateMemberRole` action,
  not in SQL, to keep the migration additive and reversible).
- `producer` is the day-to-day "admin" most staff get.

---

## 3. Permission matrix

Actions per resource: **V** view/list, **C** create, **U** update, **D** delete,
**X** special (state transitions / send / export). Empty = no access.

| Resource \ Role      | owner   | producer | finance | editor  | assistant |
|----------------------|---------|----------|---------|---------|-----------|
| **Projects**         | VCUDX   | VCUDX    | V       | VU      | V         |
| **Leads**            | VCUDX   | VCUDX    | V       | V       | VU        |
| **Invoices**         | VCUDX   | V        | VCUDX   | —       | —         |
| **Proposals (cotiza)** | VCUDX | VCUDX    | VU      | V       | V         |
| **Portfolio**        | VCUDX   | VCUD     | —       | VCUD    | V         |
| **Media library**    | VCUDX   | VCUD     | V       | VCUD    | V         |
| **Team (profiles/roles)** | VCUDX | V     | V       | —       | —         |
| **Calendar**         | VCUDX   | VCUDX    | V       | VCU     | VCU       |
| **Tasks / Kanban**   | VCUDX   | VCUDX    | V       | VCUD    | VCU       |
| **Clients**          | VCUDX   | VCUD     | VU      | V       | V         |
| **Expenses**         | VCUDX   | VCU      | VCUDX   | —       | —         |
| **Reports / Activity** | V     | V        | V       | V (own) | —         |
| **Automations**      | VCUDX   | VU       | —       | —       | —         |

X meanings by resource: Projects → change `project_status`; Leads → convert lead→client /
status changes; Invoices → mark paid / send / export CFDI; Proposals → send/accept; Team →
change another member's role & `is_admin_team`; Calendar → manage others' events; Tasks →
reassign across members; Clients → archive; Expenses → approve; Automations → run/trigger.

This matrix is the **single source of truth**. It is encoded once in TypeScript (section 5,
`PERMISSIONS`) and mirrored by RLS where the table is touched directly by `createClient()`.

---

## 4. Migration

**File:** `supabase/migrations/20260608040000_rbac_roles.sql` (timestamp > `20260608030000`;
additive only; do NOT apply — no credentials).

### 4a. Choice: enum role column vs. permissions table

**Decision: a single `staff_role` enum column on `profiles`** — *not* a join/permissions
table. Rationale:
- The permission matrix is small, static, and code-owned. A DB permissions table would
  duplicate logic that already must live in TS (server actions) and adds join cost to every
  RLS check. Roles for a ~10-person production house change rarely.
- An enum keeps RLS policies cheap (`current_staff_role() = 'finance'`) and keeps the source
  of truth in version control (the matrix in `permissions.ts`), avoiding seed-data drift.
- If per-user overrides are ever needed, add an additive `profiles.permission_overrides jsonb`
  later — no schema rewrite required.

### 4b. Migration contents (sketch)

```sql
-- 20260608040000_rbac_roles.sql  (ADDITIVE — do not apply without credentials)

-- 1. New enum for staff sub-roles. Separate from user_role so we never touch the
--    existing ('admin_staff','client') enum that RLS + generated types depend on.
DO $$ BEGIN
  CREATE TYPE public.staff_role AS ENUM
    ('owner','producer','finance','editor','assistant');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Additive column. NULL = not staff (clients) or legacy rows pending backfill.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_role public.staff_role;

-- 3. Backfill: every current staff member becomes 'owner' so nobody is locked out
--    the moment gating turns on. Owners can then demote in the UI.
UPDATE public.profiles
  SET staff_role = 'owner'
  WHERE is_admin_team = true AND staff_role IS NULL;

-- 4. Keep invariant: staff_role implies is_admin_team. Enforced as a CHECK so a
--    client row can never carry a staff_role.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_staff_role_requires_team
  CHECK (staff_role IS NULL OR is_admin_team = true) NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_staff_role_requires_team;

-- 5. SECURITY DEFINER helpers, mirroring the existing is_admin_team() pattern so
--    RLS policies can reference them without recursive policy evaluation.
CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS public.staff_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT staff_role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_staff_role(VARIADIC roles public.staff_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin_team = true
      AND staff_role = ANY(roles)
  )
$$;

GRANT EXECUTE ON FUNCTION public.current_staff_role()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_role(public.staff_role[]) TO authenticated;
```

### 4c. RLS tightening (optional second migration, phase 2)

The current "staff full" policies stay valid (every staff role still has `is_admin_team`).
**Defense-in-depth** at the DB layer is recommended but can ship after the app-layer gate.
When ready, add **finance-only WRITE** restrictions where it matters most — invoices/expenses:

```sql
-- 20260608050000_rbac_rls_finance.sql (phase 2, additive)
-- Example: only finance/owner may INSERT/UPDATE/DELETE invoices; all staff may read.
DROP POLICY IF EXISTS "invoices: staff full" ON public.invoices;
CREATE POLICY "invoices: staff read"  ON public.invoices FOR SELECT
  USING (is_admin_team());
CREATE POLICY "invoices: finance write" ON public.invoices FOR ALL
  USING (public.has_staff_role('owner','finance'))
  WITH CHECK (public.has_staff_role('owner','finance'));
```

> Note: most admin server actions use `createServiceClient()` (RLS-bypassing), so RLS is
> *not* the primary gate for them — `requireRole()` (section 5) is. RLS in 4c only hardens any
> path that uses the cookie-bound `createClient()` (e.g. Server Components reading directly).

---

## 5. App-layer authz (the primary gate)

### 5a. New file — the matrix in code

**File:** `src/lib/auth/permissions.ts` (new)

```ts
export type StaffRole = 'owner' | 'producer' | 'finance' | 'editor' | 'assistant'

export type Resource =
  | 'projects' | 'leads' | 'invoices' | 'proposals' | 'portfolio' | 'media'
  | 'team' | 'calendar' | 'tasks' | 'clients' | 'expenses' | 'reports' | 'automations'

export type Action = 'view' | 'create' | 'update' | 'delete' | 'special'

// One literal per cell of the section-3 matrix. 'VCUDX' style strings expanded to sets.
export const PERMISSIONS: Record<StaffRole, Partial<Record<Resource, Set<Action>>>> = {
  // ...encode the table here, e.g. owner gets every action on every resource...
}

export function can(role: StaffRole | null, resource: Resource, action: Action): boolean {
  if (!role) return false
  return PERMISSIONS[role]?.[resource]?.has(action) ?? false
}
```

This is the only place the matrix lives. UI, server actions, and (optionally) RLS comments all
reference it.

### 5b. `requireRole()` helper

**File:** `src/lib/supabase/server.ts` (edit — add alongside `requireAdmin`)

```ts
import { can, type Resource, type Action, type StaffRole } from '@/lib/auth/permissions'

export async function requireRole(
  resource: Resource,
  action: Action,
): Promise<{ userId: string; role: StaffRole } | { error: string }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: 'No autenticado.' }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('is_admin_team, staff_role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin_team) return { error: 'No autorizado.' }
  const role = (profile.staff_role ?? null) as StaffRole | null
  if (!can(role, resource, action)) return { error: 'Permiso insuficiente.' }
  return { userId: user.id, role: role as StaffRole }
}
```

- `requireAdmin()` is **kept unchanged** and remains valid for actions any staff role may run
  (it just means "is staff"). `requireRole()` is the stricter gate used where the matrix says
  some roles must be blocked.
- Backward-compatible: every existing action keeps working; we only swap `requireAdmin()` →
  `requireRole(resource, action)` in the actions whose resource has a restricted cell.

### 5c. Which server actions get `requireRole` (exact files)

Swap `requireAdmin()` for `requireRole(...)` only where the matrix restricts a role:

- `src/lib/actions/invoices.ts` → `requireRole('invoices', <action>)` (finance/owner write).
- `src/lib/actions/expenses.ts` → `requireRole('expenses', <action>)`.
- `src/lib/actions/team.ts` → `requireRole('team', 'special')` in `updateMemberRole` and
  `toggleAdminStatus` (owner-only). Also add the "always ≥1 owner" guard here.
- `src/lib/actions/invite-team-member.ts` → `requireRole('team', 'create')`.
- `src/lib/actions/proposals.ts` / `cotiza.ts` → `requireRole('proposals', <action>)`.
- `src/lib/actions/portfolio.ts` / `photos.ts` / `categories.ts` →
  `requireRole('portfolio'|'media', <action>)` (finance/assistant blocked from write).
- `src/lib/actions/projects.ts`, `deliverables.ts` → `requireRole('projects', <action>)`.
- `src/lib/actions/leads.ts`, `send-lead-email.ts` → `requireRole('leads', <action>)`.
- `src/lib/actions/clients.ts`, `client-types.ts` → `requireRole('clients', <action>)`.
- `src/lib/actions/calendar.ts` → `requireRole('calendar', <action>)`.
- Actions on resources every staff role may use (`notifications.ts`, `portal.ts`, `team.ts`
  reads, `test-email.ts`) keep `requireAdmin()`.

### 5d. proxy.ts gating

**File:** `proxy.ts` (edit). Keep the cheap `is_admin_team` gate (it stays the first wall: no
staff flag → bounce to `/portal`). Add a **route→role allow-list** so a role that has zero
access to a section can't even open the page:

```ts
// after the existing is_admin_team check for /admin, with profile.staff_role selected too:
const SECTION_MIN: Record<string, StaffRole[]> = {
  '/admin/invoices':  ['owner', 'finance'],
  '/admin/team':      ['owner', 'producer', 'finance'], // view; owner-only mutations gated in action
  '/admin/automatizaciones': ['owner', 'producer'],
  // sections not listed are visible to all staff roles
}
```

- `proxy.ts` is **convenience/UX only** — it prevents obvious navigation. It is NOT trusted for
  authz (per CLAUDE.md). The real enforcement is `requireRole()` in the actions and (phase 2)
  RLS. Add `staff_role` to the two `profiles` selects already in `proxy.ts`.
- Keep `/` short-circuit and the `/login` redirect logic untouched.

---

## 6. Minimal UI changes

1. **Sidebar** (`src/components/admin/sidebar.tsx`): accept `staffRole` in `SidebarProps`,
   tag each `NavItem` with an optional `roles?: StaffRole[]`, and filter `NAV_GROUPS` so a role
   without access doesn't see the link (e.g. `editor`/`assistant` don't see *Facturas*;
   non-owners don't see role controls). Pass `staffRole` down from the layout.
2. **Admin layout** (`app/(admin)/layout.tsx`): add `staff_role` to the `profiles` select and
   pass it to `<Sidebar>` (and `<MobileNav>`).
3. **MobileNav** (`src/components/admin/MobileNav.tsx`): same `staffRole` prop + same filter
   (share the filter helper with the sidebar to avoid drift).
4. **Team page** (`app/(admin)/admin/team/page.tsx` + `TeamMemberCard` /
   `InviteMemberForm`): replace the ad-hoc `ADMIN_ROLES` set with a `staff_role` dropdown
   bound to the `StaffRole` union; show the role; disable the control unless the current user
   is `owner`. Keep `display_role` as the free-text job title (separate field).
5. **Per-page guards (optional polish):** pages whose section is role-restricted should also
   `redirect('/admin')` server-side if `!can(role, resource, 'view')`, matching the proxy
   allow-list, so a deep link can't render an empty shell.

All UI uses existing inline `var(--dash-*)` tokens + `lucide-react` only. No new deps.

---

## 7. Exact file list

**Create**
- `supabase/migrations/20260608040000_rbac_roles.sql` — enum + column + backfill + helpers.
- `supabase/migrations/20260608050000_rbac_rls_finance.sql` — (phase 2) RLS write-narrowing.
- `src/lib/auth/permissions.ts` — `StaffRole`, `Resource`, `Action`, `PERMISSIONS`, `can()`.

**Edit**
- `src/lib/supabase/server.ts` — add `requireRole()` (keep `requireAdmin()`).
- `src/lib/supabase/types.ts` — regen / add `staff_role` to `profiles` row + `staff_role`
  enum (run `supabase gen types` after migration applies; do not hand-edit beyond stopgap).
- `proxy.ts` — select `staff_role`; add `SECTION_MIN` route allow-list.
- `app/(admin)/layout.tsx` — select + pass `staff_role`.
- `src/components/admin/sidebar.tsx`, `src/components/admin/MobileNav.tsx` — role-filter nav.
- `app/(admin)/admin/team/page.tsx` + `src/components/admin/team/TeamMemberCard.tsx` +
  `.../InviteMemberForm.tsx` — `staff_role` dropdown, owner-only mutation.
- Server actions to swap to `requireRole(...)`: `invoices.ts`, `expenses.ts`, `team.ts`,
  `invite-team-member.ts`, `proposals.ts`, `cotiza.ts`, `portfolio.ts`, `photos.ts`,
  `categories.ts`, `projects.ts`, `deliverables.ts`, `leads.ts`, `send-lead-email.ts`,
  `clients.ts`, `client-types.ts`, `calendar.ts`.

**Do NOT touch:** old migration files, `media_registry.json`, the public `/` surface,
`user_role` enum, `is_admin_team` semantics.

---

## 8. Rollout / activation checklist (what's left to turn it on)

1. Apply `20260608040000_rbac_roles.sql` (needs DB credentials — not in this env).
2. `npx supabase gen types` → refresh `src/lib/supabase/types.ts` so `staff_role` is typed.
3. Land `permissions.ts` + `requireRole()` (no behavior change yet — all current staff are
   `owner`, so they retain full access).
4. Swap actions to `requireRole(...)` and add the proxy allow-list + nav filtering.
5. In `/admin/team`, an `owner` assigns real roles to each member.
6. (Phase 2) Apply `20260608050000_rbac_rls_finance.sql` for DB-level defense in depth.
7. Verify the "≥1 owner" guard in `team.ts` prevents the last owner from being demoted.

**Safety property:** the backfill makes every existing staff member an `owner`, so enabling
RBAC is non-breaking; access only narrows once an owner deliberately re-assigns roles.
