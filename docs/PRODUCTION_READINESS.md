# XICO Films — Production Readiness (Documento Maestro)

**Fecha:** 2026-06-08
**Lead de ingeniería:** síntesis de 9 agentes (3 de construcción, 1 de auditoría, 5 de planeación).
**Stack:** Next.js 16 + React 19 + Supabase (RLS). TypeScript strict.

## Leyenda de estado

- **HECHO** — entregado y verificado en disco; ya aporta valor o queda activo tras aplicar migración/secrets de infra.
- **PLAN LISTO** — diseño ejecutable escrito; falta código de aplicación (y a veces credenciales).
- **BLOQUEADO-EN-USUARIO** — requiere una acción no agentable: secreto, decisión de plan, redeploy, o credencial de Supabase/PAC/Stripe.

> Regla operativa global: ningún agente aplicó migraciones (no hay credenciales) ni instaló dependencias (CLAUDE.md lo prohíbe). Todas las migraciones nuevas son **aditivas** con timestamp posterior a `20260608030000`.

---

## Resumen por prioridad

| Ítem | Prioridad | Estado | Entregable |
|---|---|---|---|
| CI/CD pipeline | P0 | HECHO (archivo) · BLOQUEADO (secrets+lockfile) | `.github/workflows/ci.yml` |
| Audit trail (tabla + helper) | P0 | HECHO (archivos) · falta cablear | `20260608040000_audit_log.sql`, `src/lib/audit.ts` |
| Hardening de seguridad (A1) | P0 | PLAN LISTO (reporte) | `docs/SECURITY_REVIEW.md` |
| Notifications (tabla + in-app + email) | P0 | PLAN LISTO | `docs/NOTIFICATIONS_PLAN.md` |
| Type-safety / quitar `as any` | P0 | PLAN LISTO · BLOQUEADO (token) | `docs/TYPESAFETY_PLAN.md` |
| Realtime (leads/projects) | P1 | HECHO (archivo) · falta aplicar | `20260608050000_realtime.sql` |
| RBAC granular (staff_role) | P1 | PLAN LISTO | `docs/RBAC_PLAN.md` |
| Testing (Vitest + Playwright) | P1 | PLAN LISTO · BLOQUEADO (devDeps) | `docs/TESTING_PLAN.md` |
| Hardening M1/M2/M3 | P2 | PLAN LISTO (reporte) | `docs/SECURITY_REVIEW.md` |
| Infra de producción (env/deploy/SMTP/PITR/PAC/Stripe) | P0–P2 | BLOQUEADO-EN-USUARIO | — (ver §Bloqueos) |

---

## P0 — Bloqueantes de producción

### P0.1 — CI/CD pipeline — **HECHO (archivo) · BLOQUEADO-EN-USUARIO (secrets + lockfile)**

- **Entregado:** `.github/workflows/ci.yml`. Job `build` en `ubuntu-latest`, Node 20 con caché npm. Pasos: `npm ci → npx tsc --noEmit → npm run build → npm run lint`. `working-directory: xico-films`, `cache-dependency-path: xico-films/package-lock.json`. Vars públicas de Supabase con fallback a placeholders para no romper builds de forks/PRs.
- **Siguiente paso concreto:**
  1. Confirmar que existe y está commiteado `xico-films/package-lock.json` (lo exige `npm ci` y la caché). Si no, generarlo (`npm install`) y commitearlo.
  2. Cargar secrets en GitHub (Settings → Secrets → Actions): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Opcionales: `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `CRON_SECRET`.
  3. Verificar localmente que `npx tsc --noEmit` pasa (usa el `tsconfig.json` raíz; no hay tsconfig dedicado de typecheck).

### P0.2 — Audit trail — **HECHO (archivos) · falta aplicar migración + cablear actions**

- **Entregado:**
  - `supabase/migrations/20260608040000_audit_log.sql` — tabla `public.audit_log` (`id`, `created_at`, `actor_id → profiles ON DELETE SET NULL`, `action`, `entity_type`, `entity_id`, `summary`, `metadata jsonb`). RLS con política `audit_log: staff full` (FOR ALL vía `is_admin_team()`). Índices en `(entity_type, entity_id)`, `(created_at DESC)`, `(actor_id)`. Idempotente y aditiva.
  - `src/lib/audit.ts` — `logAudit(params): Promise<boolean>`. Inserta vía `createServiceClient()` (bypass RLS). Errores capturados en silencio (nunca rompe el action que la invoca). Tipos estrictos; sin `any` nuevos, sin `@ts-ignore`. Pasa `tsc` y `eslint` limpios.
- **Nota de calidad:** usa un cast local (`as unknown as SupabaseClient`) porque `audit_log` aún no está en `types.ts`. Se elimina al regenerar tipos tras aplicar la migración.
- **Siguiente paso concreto:**
  1. Aplicar la migración cuando haya credenciales (`npx supabase db push`). *(depende de Bloqueo B-DB)*
  2. Regenerar `src/lib/supabase/types.ts` y quitar el cast (opcional, mejora).
  3. Cablear `logAudit(...)` en las server actions pasando `actorId` de `requireAdmin()`. Prioridad por valor de trazabilidad: **`invoices.ts` (financiero) → `team.ts`/`invite-team-member.ts` (privilegios) → `leads.ts`/`clients.ts`/`projects.ts`/`deliverables.ts`/`proposals.ts` → `cotiza.ts`/`expenses.ts`/`calendar.ts` → `portfolio.ts`/`photos.ts`/`categories.ts`**.

### P0.3 — Hardening de seguridad — **PLAN LISTO (reporte de auditoría)**

- **Entregado:** `docs/SECURITY_REVIEW.md`. Veredicto general: patrón sólido (admin actions con service-role llaman `requireAdmin()`; portal filtra por `client_id`/`profile_id`; RLS contiene los casos hoy). **Cero hallazgos explotables hoy.**
- **Hallazgo de mayor impacto — A1 (ALTO):** `app/(portal)/portal/calendario/page.tsx:46-50` consulta `calendar_events` **sin** `.eq('client_id', ...)` a nivel de aplicación (a diferencia del resto del portal). Hoy lo contiene la RLS `calendar_events: client read own`, pero es frágil si esa política cambia en el futuro. Además usa `(supabase as any)`.
- **Siguiente paso concreto (P0):** agregar el filtro de aplicación `.eq('client_id', <cliente del usuario>)` en `calendario/page.tsx` (defensa en profundidad) y eliminar el cast `as any` tras regenerar tipos de `calendar_events`. *(Edición fuera del alcance del reporte; asignar a un agente de implementación.)*

### P0.4 — Notifications (in-app + email) — **PLAN LISTO**

- **Entregado:** `docs/NOTIFICATIONS_PLAN.md`.
- **Hallazgo crítico:** la tabla `notifications` **no existe** (sin migración, sin `types.ts`), pero `NotificationBell.tsx` y `src/lib/actions/notifications.ts` ya la consumen con `(db as any)`. El primer paso es **crearla**. Contrato esperado por la UI: `id, title, body, type('info|success|warning|error'), entity_type, entity_id, is_read, created_at`, ruteo por `entity_type` (project/client/lead/invoice).
- **Arquitectura:** email SIEMPRE desde server action o cron (Resend vive en Node); in-app desde la server action (fuente única de verdad); triggers de Postgres solo como respaldo opcional; cron para eventos temporales. 8 eventos mapeados (E1 factura enviada … E8 nuevo lead). El cron `/api/cron/reminders` (ya valida `Bearer CRON_SECRET`) se amplía con facturas vencidas y eventos de calendario próximos.
- **Migraciones a crear (aditivas, NO aplicadas):** M1 `20260608060000_notifications.sql` (OBLIGATORIA), M2 `20260608070000_notification_triggers.sql` (opcional, respaldo), M3 columnas de dedupe (opcional).
- **Siguiente paso concreto:**
  1. Crear y aplicar M1; regenerar `types.ts`; quitar el `as any` de `notifications.ts`.
  2. Implementar plantillas y llamadas in-app/email en `templates.ts`, `invoices.ts`, `proposals.ts`, `portal.ts`, `leads.ts`, `cotiza.ts` y el `route.ts` del cron.
  3. Confirmar env de email *(Bloqueo B-ENV)* y que `clients` tenga email de contacto.

### P0.5 — Type-safety (quitar 55 `as any`) — **PLAN LISTO · BLOQUEADO-EN-USUARIO (token)**

- **Entregado:** `docs/TYPESAFETY_PLAN.md`. Inventario de 55 `as any` (49 en `src/lib/actions/**`, 7 en `app/(admin)/**`, 4 en `app/(portal)/**`).
- **Causa raíz:** `src/lib/supabase/types.ts` está escrito a mano y desfasado: faltan tablas ya migradas (`calendar_events`, `photo_albums`, `portfolio_photos`, `project_comments`) y columnas CFDI (`items`, `subtotal`, `tax`, `client_type`, `fiscal_data`, `proposal_id`).
- **Riesgos bloqueantes:** **R1** — `client_types` y `lead_client_types` no tienen migración en el repo (drift no reconciliado); `gen types` no las emitirá → crear migración aditiva antes de tiparlas. **R2** — `SUPABASE_ACCESS_TOKEN` no está en `.env.local`; bloquea `gen types` remoto (project ref `hncwnykfqeyghlpfygyw`). **R4** — verificar/crear `notifications` (coincide con P0.4). **R6** — `types.ts` exporta ~10 alias de enum a mano que `gen types` no emite; preservarlos.
- **Siguiente paso concreto:**
  1. Proveer `SUPABASE_ACCESS_TOKEN` (o usar stack local `supabase start`). *(Bloqueo B-DB)*
  2. Crear migración aditiva para `client_types`/`lead_client_types` (R1) y `notifications` (R4).
  3. Ejecutar `supabase gen types`, reconciliar enums (R6), y retirar casts por archivo en el orden del plan (empezando por `client-types.ts`, `invoices.ts`, `proposals.ts`).

---

## P1 — Importantes (post-lanzamiento inmediato)

### P1.1 — Realtime (leads/projects) — **HECHO (archivo) · falta aplicar**

- **Entregado:** `supabase/migrations/20260608050000_realtime.sql`. Agrega `public.leads` y `public.projects` a la publicación `supabase_realtime` con guardas `IF NOT EXISTS` (idempotente/aditiva). Habilita: badges en vivo del sidebar, `RealtimeStats.tsx` (contadores) y `LeadsPipeline.tsx` (tarjetas en tiempo real).
- **Siguiente paso concreto:**
  1. Aplicar la migración *(Bloqueo B-DB)*.
  2. Verificar en el panel de Supabase que Realtime está habilitado y que la RLS de admin permite recibir eventos `postgres_changes` (Realtime respeta RLS). Si los SELECT de admin ya están autorizados, no requiere cambios.
  - *(Fuera de alcance de esta tarea: `deliverable_comments` también usa realtime; agregarlo en una migración futura si se desea.)*

### P1.2 — RBAC granular — **PLAN LISTO**

- **Entregado:** `docs/RBAC_PLAN.md`.
- **Hallazgo clave:** el rol real es un **enum** `user_role = ('admin_staff','client')` (no un CHECK). El plan no toca ese enum; agrega una columna aditiva `profiles.staff_role` (`owner/producer/finance/editor/assistant`) con backfill de todo el staff a `owner` (encendido no disruptivo). La matriz de permisos vive una sola vez en TS (`src/lib/auth/permissions.ts`). Como las admin actions usan `createServiceClient()` (bypass RLS), **la capa de app (`requireRole`) es la compuerta primaria**.
- **Siguiente paso concreto:**
  1. Crear y aplicar migración `20260608040000_rbac_roles.sql` *(¡colisión de timestamp! ver nota abajo)*; opcional fase-2 RLS de finanzas.
  2. Ejecutar `supabase gen types` para tipar `staff_role`.
  3. Aterrizar `permissions.ts` + `requireRole()`; convertir ~16 actions a `requireRole`; filtrar nav por rol; guard "siempre ≥1 owner" en `team.ts`.
  4. Un owner asigna roles reales en `/admin/team`.
- **⚠ Nota de coordinación (lead):** el plan RBAC propone el timestamp `20260608040000`, **ya ocupado por `audit_log.sql`** (y `..050000` por realtime). Al implementar, **renumerar** las migraciones RBAC a `20260608080000_rbac_roles.sql` y `20260608090000_rbac_rls_finance.sql` para mantener el orden aditivo. Igualmente coordinar con notifications (M1 `..060000`, M2 `..070000`).

### P1.3 — Testing (Vitest + Playwright) — **PLAN LISTO · BLOQUEADO-EN-USUARIO (devDeps)**

- **Entregado:** `docs/TESTING_PLAN.md`. Estrategia de 2 capas: Vitest (unit/lógica pura) + Playwright (e2e). 5 flujos P0: gate admin (`requireAdmin()`/redirects 307), crear proyecto, cotización→factura CFDI (unit sobre `tax.ts`: IVA 16%, ISR 10%, IVA ret. 10.666%, total recalculado en servidor), evento de calendario visible solo para el cliente dueño, y aislamiento RLS (Cliente B no ve datos de Cliente A) a nivel DB y UI. Ningún `*.test.ts` real fue creado (para no romper `tsc`).
- **Siguiente paso concreto:**
  1. **Aprobar e instalar devDeps** (requiere aprobación CLAUDE.md): `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test` (+ `playwright install`). `pg` ya existe y se reutiliza.
  2. Crear configs (`vitest.config.ts`, `playwright.config.ts`, `vitest.setup.ts`), agregar scripts `test*` a `package.json`, excluir tests del `tsconfig` para no afectar `next build`.
  3. Convertir los bloques de ejemplo en archivos reales + helpers `e2e/helpers/{auth,db}.ts`; definir env `SUPABASE_TEST_*` y stack local de Supabase.

---

## P2 — Mejoras de robustez

### P2.1 — Hardening adicional (M1/M2/M3) — **PLAN LISTO (reporte)**

Detallado en `docs/SECURITY_REVIEW.md`. Todos contenidos por RLS hoy; corregir para cumplir CLAUDE.md y robustez:

- **M1** — `src/lib/actions/portfolio.ts:23,31,42,50`: 4 actions de portafolio sin `requireAdmin()` (solo RLS) y sin caps de input en `parseVideoForm`. **Siguiente paso:** agregar `requireAdmin()` y validación de longitud.
- **M2** — `src/lib/actions/cotiza.ts`: endpoint público que inserta en `leads` con service-role; tiene caps de longitud pero **sin rate-limit ni honeypot**. **Siguiente paso:** agregar honeypot + rate-limit básico (anti-spam).
- **M3** — `src/lib/actions/invite-team-member.ts:18-40` (`updateMyProfile`): escribe con service-role usando `as unknown as Record<string, unknown>` (anula tipado de columnas). **Siguiente paso:** tipar columnas editables explícitamente tras regenerar `types.ts`.

### P2.2 — Verificado como correcto (no requiere acción)

Del reporte de seguridad: cron exige `Bearer CRON_SECRET`; export CSV con `requireAdmin()` + whitelist de `period`; `portal.ts` verifica propiedad antes del service-role; `ClientUploader` con RLS `WITH CHECK` impide insertar para otro `client_id`.

---

## Bloqueos en el usuario (no agentables) — requeridos para activar P0/P1

Estos pasos no los puede hacer ningún agente (faltan credenciales/decisiones/infra). Agrupados por desbloqueo:

**B-DB — Credenciales de Supabase (desbloquea P0.2, P0.4, P0.5, P1.1, P1.2):**
- Proveer `SUPABASE_ACCESS_TOKEN` (o levantar stack local) para aplicar migraciones y correr `supabase gen types`.
- Aplicar, en orden de timestamp, las migraciones nuevas: `audit_log`, `realtime`, y las que se creen (notifications, rbac, client_types).
- Regenerar `src/lib/supabase/types.ts` tras aplicar.

**B-ENV — Variables de entorno faltantes (desbloquea P0.1 secrets, P0.4 email, cron):**
- `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `CRON_SECRET`. (El email hace no-op sin key; sin estas, las notificaciones por correo no se envían.)
- Cargar también los secrets de Supabase en GitHub Actions (P0.1).

**B-DEPLOY — Vercel / Auth (operación):**
- Redeploy a Vercel tras commitear `ci.yml` y las migraciones.
- **Auth Site URL** sigue en `http://localhost:3000` → cambiar a la URL de producción (rompe magic links / confirmaciones en prod si no se corrige).
- Configurar SMTP/Resend en Supabase Auth (dominio verificado para `EMAIL_FROM`).

**B-DEVDEPS — Aprobación de dependencias (desbloquea P1.3):**
- Aprobar instalación de las devDeps de testing (Vitest + Playwright + RTL).

**B-NEGOCIO — Decisiones / integraciones externas (P2 y datos reales):**
- CFDI: timbrado real con un PAC (hoy no hay integración productiva).
- Pagos: integración de Stripe.
- Backups/PITR: requiere plan de Supabase con PITR.
- Cargar equipo/clientes reales; un owner debe asignar `staff_role` en `/admin/team` (P1.2).
- **Revocar el token `sbp.`** expuesto (higiene de seguridad — hacer cuanto antes).

---

## Apéndice — Archivos entregados por esta ronda de agentes

| Archivo | Tipo | Agente |
|---|---|---|
| `.github/workflows/ci.yml` | código | build:ci |
| `supabase/migrations/20260608040000_audit_log.sql` | migración (sin aplicar) | build:audit-trail |
| `src/lib/audit.ts` | código | build:audit-trail |
| `supabase/migrations/20260608050000_realtime.sql` | migración (sin aplicar) | build:realtime |
| `docs/SECURITY_REVIEW.md` | reporte | report:security |
| `docs/RBAC_PLAN.md` | plan | plan:rbac |
| `docs/NOTIFICATIONS_PLAN.md` | plan | plan:notifications |
| `docs/TYPESAFETY_PLAN.md` | plan | plan:typesafety |
| `docs/TESTING_PLAN.md` | plan | plan:testing |
| `docs/PRODUCTION_READINESS.md` | este documento | lead (síntesis) |
