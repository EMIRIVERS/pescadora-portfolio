# P2 — Type-Safety Plan: eliminar `as any` / `(db as any)` en Supabase

> Doc de planeación. **No** modifica código fuera de este archivo.
> Objetivo: regenerar `src/lib/supabase/types.ts` desde el esquema real y
> eliminar, archivo por archivo, los casts `as any` que hoy enmascaran tablas
> y columnas ausentes del tipo `Database`.

Fecha: 2026-06-08 · Cutoff de migraciones reconciliadas: `20260608030000`

---

## 1. Por qué existen los casts

`src/lib/supabase/types.ts` está **escrito a mano** (no generado). Su encabezado lo dice:

```
// Hand-written Supabase Database types.
// Replace with `npx supabase gen types typescript --project-id <id>` once the project is linked.
```

El cliente de `@supabase/supabase-js` es genérico sobre `Database`. Cuando el
código consulta una tabla que **no existe** en `Database['public']['Tables']`,
`.from('tabla')` no compila en modo strict; el patrón usado para destrabar fue
castear el cliente a `any` (`(db as any).from(...)`, o el alias local
`type AnyTable = any` en `client-types.ts`). Eso apaga TODO el type-checking de
esa query (tabla, columnas de `.insert/.update`, shape del `data` devuelto).

Hay **dos causas distintas** detrás de cada cast:

- **(A) Tabla ausente del tipo** — la tabla existe en la BD/migración pero
  nunca se agregó al `types.ts` hecho a mano: `calendar_events`,
  `notifications`, `photo_albums`, `portfolio_photos`, `project_comments`.
- **(B) Columnas ausentes en una tabla que sí está tipada** — `invoices` y
  `proposals` existen en `types.ts`, pero su `Row/Insert/Update` quedó
  desfasado de la migración CFDI (`20260608000000_billing_cfdi.sql`). El cast
  permite `.insert({ items, subtotal, tax, client_type, fiscal_data, ... })`
  sobre columnas que el tipo desconoce.
- **(C) Tabla SIN migración** — caso especial de `client_types` /
  `lead_client_types`: usadas por el código pero **no existen en ninguna
  migración del repo** (ver Riesgo R1, bloqueante).

---

## 2. Inventario de `as any` (conteo por archivo)

Total: **55** ocurrencias (`as any` y el alias `AnyTable`) en el scope pedido.

### `src/lib/actions/**` — 49

| Archivo | Casts | Tabla(s) afectadas | Causa |
|---|---:|---|---|
| `photos.ts` | 11 | `photo_albums`, `portfolio_photos` | A |
| `categories.ts` | 8 | `portfolio_categories` | B (ver R3) |
| `client-types.ts` | 8 (`AnyTable`) | `client_types`, `lead_client_types` | C (bloqueante) |
| `invoices.ts` | 7 | `invoices`, `proposals` | B |
| `calendar.ts` | 5 | `calendar_events` | A |
| `proposals.ts` | 5 | `proposals` | B |
| `notifications.ts` | 4 | `notifications` | A |
| `projects.ts` | 3 | `project_comments` | A |
| `invite-team-member.ts` | 1 | `profiles` (update is_admin_team) | B/D |

> Nota: `client-types.ts` no usa el literal `as any`; usa
> `type AnyTable = any` + `(db as AnyTable)`. Cuenta para P2 igual (es un `any`).

### `app/(admin)/**` — 7

| Archivo | Casts | Tabla(s) | Causa |
|---|---:|---|---|
| `admin/portfolio/page.tsx` | 2 | `portfolio_categories`, `portfolio_photos`/`photo_albums` | A/B |
| `admin/calendar/page.tsx` | 1 | `invoices` (select id, invoice_number) | B |
| `admin/invoices/page.tsx` | 1 | `invoices` (join clients/projects) | B |
| `admin/invoices/[id]/page.tsx` | 1 | `invoices` | B |
| `admin/proposals/page.tsx` | 1 | `proposals` | B |
| `admin/actividad/page.tsx` | 1 | `notifications` / `audit_log` | A |

### `app/(portal)/**` — 4

| Archivo | Casts | Tabla(s) | Causa |
|---|---:|---|---|
| `portal/page.tsx` | 1 | `calendar_events` (eventRows) | A |
| `portal/calendario/page.tsx` | 1 | `calendar_events` | A |
| `portal/invoices/page.tsx` | 1 | `invoices` | B |
| `portal/rendimiento/page.tsx` | 1 | (varios; `const sb = supabase as any`) | A/B |

---

## 3. Estado de `types.ts` vs. esquema real

Tablas **presentes** en `types.ts` (20):
`client_uploads, clients, deliverable_comments, deliverable_revisions,
email_log, invoices, lead_activities, leads, portfolio_categories,
portfolio_videos, profiles, project_assignments, project_deliverables,
project_expenses, projects, proposals, task_activity_log, task_boards,
task_categories, tasks`.

Tablas **usadas por el código pero AUSENTES** de `types.ts`:

| Tabla | ¿Migración existe? | Migración |
|---|---|---|
| `calendar_events` | sí | `20260608010000_calendar_events.sql` |
| `notifications` | revisar (no se localizó CREATE; ver R4) | — |
| `photo_albums` | sí | `20260417000000_photo_albums.sql` |
| `portfolio_photos` | sí | `20260417000000_photo_albums.sql` |
| `project_comments` | sí | `20260421000000_missing_tables.sql` |
| `audit_log` | sí | `20260608040000_audit_log.sql` |
| `client_types` | **NO** (bloqueante R1) | — |
| `lead_client_types` | **NO** (bloqueante R1) | — |

Columnas CFDI presentes en migración pero **ausentes del `Row` tipado**:

- `invoices`: faltan `items`, `subtotal`, `tax`, `client_type`, `fiscal_data`,
  `proposal_id`, `issue_date`. (El `types.ts` actual sólo tiene
  `id, created_at, updated_at, client_id, project_id, invoice_number, title,
  amount, currency, status, issue_date?, due_date, notes, paid_at`.)
- `proposals`: faltan `subtotal`, `tax`, `client_type`, `fiscal_data` (de
  `20260608000000_billing_cfdi.sql`) además de los campos base que ya use el
  código (`items`, `valid_until`, `lead_id`, `total`).

---

## 4. Regenerar `types.ts` con `supabase gen types`

**Bloqueador de credenciales:** la tarea no debe aplicar migraciones, y además
`SUPABASE_ACCESS_TOKEN` **no está presente en `.env.local`** (CLAUDE.md lo lista
como esperado, pero hoy no existe). `supabase gen types --project-id` requiere
ese token (o `--db-url`). Project ref detectado:
`hncwnykfqeyghlpfygyw` (de `NEXT_PUBLIC_SUPABASE_URL`).

### Opción A — contra el proyecto remoto (requiere token)

```bash
# 1. Exportar el token de acceso (Personal Access Token de Supabase)
export SUPABASE_ACCESS_TOKEN=<token>

# 2. Generar tipos del esquema public al archivo destino
npx supabase gen types typescript \
  --project-id hncwnykfqeyghlpfygyw \
  --schema public \
  > src/lib/supabase/types.gen.ts
```

### Opción B — contra el stack local (requiere `supabase start`)

```bash
npx supabase start                 # levanta Postgres local con las migraciones
npx supabase gen types typescript --local --schema public \
  > src/lib/supabase/types.gen.ts
```

### Opción C — contra una DB URL directa (CI / sin login)

```bash
npx supabase gen types typescript \
  --db-url "postgresql://postgres:<pwd>@db.hncwnykfqeyghlpfygyw.supabase.co:5432/postgres" \
  --schema public > src/lib/supabase/types.gen.ts
```

### Reconciliación del archivo generado

El `types.ts` actual exporta **enums/alias hechos a mano** que el código importa
fuera del namespace `Database` (`UserRole, ProjectStatus, DeliverableType,
DeliverableStatus, TaskPriority, LeadStatus, LeadSource, LeadActivityType,
InvoiceStatus, ProposalStatus`). `supabase gen types` NO los emite como esos
alias. Por eso **no** se debe sobreescribir a ciegas:

1. Generar a `types.gen.ts` (no pisar `types.ts` aún).
2. Reemplazar el `export interface Database { ... }` de `types.ts` por el
   `Database` generado.
3. **Conservar** los `export type ...` de alias arriba del archivo. Si el
   generado define los enums como `Database['public']['Enums'][...]`, mapear
   cada alias a ese enum (p. ej. `export type InvoiceStatus =
   Database['public']['Enums']['invoice_status']`) para no romper imports.
4. Verificar que no queden columnas tipadas como `Json` donde el código asume
   un shape concreto (`tax`, `fiscal_data`, `items`): definir tipos auxiliares
   (`TaxBreakdown`, `FiscalData`, `QuoteLine`) y castear sólo en el borde de
   lectura, no con `as any`.
5. `npm run lint` + `tsc --noEmit` para validar.

---

## 5. Eliminación de casts — archivo por archivo

Orden sugerido (de menor a mayor riesgo). Tras regenerar `types.ts`, cada paso
es: quitar `as any`/`AnyTable`, dejar que el cliente infiera, y resolver el
shape de `data` con los tipos `Row`/`Insert` generados.

1. **`notifications.ts`** (4) — tabla simple; depende de confirmar/crear la
   tabla (R4). Quitar `(db as any)`; tipar inserts contra `Insert`.
2. **`calendar.ts`** (5) + **portal `page.tsx`/`calendario/page.tsx`** (2) —
   tabla `calendar_events` ya migrada; sólo falta en el tipo. Bajo riesgo.
3. **`projects.ts`** (3) — `project_comments` ya migrada. Bajo riesgo.
4. **`photos.ts`** (11) + **admin `portfolio/page.tsx`** (2) — `photo_albums`,
   `portfolio_photos` ya migradas. Volumen alto pero mecánico.
5. **`categories.ts`** (8) + parte de `portfolio/page.tsx` — `portfolio_categories`
   YA está en el tipo (ver R3): confirmar si el cast es por columna faltante
   (`is_visible`, `label`, `sort_order`) o por hábito; varios podrían quitarse
   sin regenerar.
6. **`proposals.ts`** (5) + **admin `proposals/page.tsx`** (1) — requiere las
   columnas CFDI en el tipo regenerado.
7. **`invoices.ts`** (7) + **admin `invoices/page.tsx`, `invoices/[id]/page.tsx`,
   `calendar/page.tsx`** + **portal `invoices/page.tsx`** — requiere columnas
   CFDI; usa joins (`clients(name), projects(title)`) que el generado tipa como
   relaciones: validar el shape anidado.
8. **`portal/rendimiento/page.tsx`** (1) — `const sb = supabase as any` cubre
   varias queries; revisar cada `sb.from(...)` y tabla por separado.
9. **`invite-team-member.ts`** (1) — update de `profiles.is_admin_team`;
   confirmar que la columna esté tipada y quitar el cast.
10. **`client-types.ts`** (8, alias `AnyTable`) — **último**: bloqueado por R1
    (no hay migración). Hasta crear la migración y regenerar, no se puede tipar.

Regla de cierre: una vez sin `as any`, **borrar** `// eslint-disable-next-line
@typescript-eslint/no-explicit-any` y el `type AnyTable = any` que queden
huérfanos.

---

## 6. Riesgos

- **R1 (BLOQUEANTE) — `client_types` / `lead_client_types` sin migración.**
  `grep` no encuentra ningún `CREATE TABLE` para estas tablas en
  `supabase/migrations/`. Si funcionan en producción, se crearon fuera del
  control de migraciones (drift no reconciliado). Antes de poder tipar
  `client-types.ts` hay que: (a) crear una migración aditiva
  (`>20260608030000`) que las defina con `CREATE TABLE IF NOT EXISTS` + RLS, y
  (b) regenerar tipos. **Sin esto, `gen types` no las incluirá y el cast es
  inevitable.** Columnas que el código asume:
  `client_types(id, label, color, sort_order)` y
  `lead_client_types(lead_id, client_type_id)` con FK a ambas.

- **R2 — Token ausente.** `SUPABASE_ACCESS_TOKEN` no está en `.env.local`. La
  regeneración (Opción A) está bloqueada hasta proveerlo; usar Opción B (stack
  local) o C (db-url) si no se consigue el PAT. Esta tarea **no** ejecuta `gen
  types` (sin credenciales): sólo deja el procedimiento.

- **R3 — `portfolio_categories` ya está tipada pero igual se castea.** 8 casts
  en `categories.ts` + 1 en `portfolio/page.tsx` sobre una tabla presente en
  `types.ts`. Posibles motivos: (a) faltan columnas en el `Row` hecho a mano
  (`is_visible`?), o (b) cast por inercia. Al regenerar, varios de estos casts
  deberían quitarse **sin** depender de nada más — buen candidato de validación
  temprana de que la regeneración funciona.

- **R4 — `notifications` y `audit_log`: confirmar fuente.** No se localizó un
  `CREATE TABLE notifications` en el grep de migraciones (sí existe
  `20260608040000_audit_log.sql`). `notifications.ts` inserta/lee
  `title, body, type, entity_type, entity_id, is_read, created_at`. Verificar
  que la tabla exista en una migración; si no, es otro drift tipo R1 y necesita
  migración aditiva antes de tipar.

- **R5 — Columnas CFDI desfasadas (`invoices`/`proposals`).** El `Row` a mano de
  `invoices` NO tiene `items, subtotal, tax, client_type, fiscal_data,
  proposal_id`. Si se regenera SÓLO el `Database` pero el código lee
  `row.tax.iva` etc., hay que tipar `tax`/`fiscal_data`/`items` (hoy `jsonb` →
  `Json`) con interfaces propias (`TaxBreakdown`, `FiscalData`, `QuoteLine[]`),
  o seguirá necesitando un cast acotado en la lectura. Plan: NO usar `as any`;
  usar `as TaxBreakdown` puntual y documentado.

- **R6 — Pérdida de los alias de enum.** Sobrescribir `types.ts` con la salida
  cruda de `gen types` rompería ~10 imports de enums (`InvoiceStatus`, etc.).
  Mitigación: paso 3 de §4 (conservar/mapear alias). Validar con `tsc` que
  ningún import de `@/lib/supabase/types` quede roto.

- **R7 — Joins anidados.** Queries con `select('*, clients(name),
  projects(title)')` (`invoices/page.tsx`) producen un shape anidado que el
  cliente tipado infiere como relación. Tras quitar el cast, ajustar los tipos
  de consumo en la página para el objeto anidado (no `string`).

---

## 7. Definición de "hecho"

- [ ] `types.ts` regenerado desde el esquema real (con migraciones R1/R4
      resueltas) y alias de enum preservados.
- [ ] 0 ocurrencias de `as any` / `(db as any)` / `AnyTable` en
      `src/lib/actions/**`, `app/(admin)/**`, `app/(portal)/**`.
- [ ] 0 `eslint-disable ... no-explicit-any` huérfanos en esos archivos.
- [ ] `npm run lint` y `tsc --noEmit` en verde.
- [ ] Casts acotados restantes (si los hay) son `as <TipoConcreto>` sobre
      campos `Json`, documentados, nunca `any`.
