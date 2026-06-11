# Security Review — P2 (RLS / service-role / authz)

Fecha: 2026-06-08
Alcance: `src/lib/actions/**`, `app/(admin)/**`, `app/(portal)/**`, rutas API y políticas RLS relacionadas.
Modo: REPORTE — no se modificó código.

## Resumen ejecutivo

El patrón general es sólido:

- Todas las server actions de administración revisadas llaman `requireAdmin()` **antes** de
  tocar datos con `createServiceClient()` (service-role / bypass RLS).
- Las páginas y acciones del portal usan `createClient()` (RLS) y/o verifican propiedad por
  `profile_id = auth.uid()` y `client_id` del usuario.
- Las políticas RLS de las tablas sensibles (`portfolio_videos`, `calendar_events`,
  `client_uploads`) sí restringen por `is_admin_team` o por `client_id ∈ clients(profile_id =
  auth.uid())`, por lo que actúan como red de seguridad.

No se encontró ninguna fuga de datos entre clientes explotable hoy (RLS la contiene en todos
los casos). Los hallazgos son principalmente **defensa en profundidad** y **validación de
input**: lugares donde la única barrera es RLS y una regresión en una migración futura
expondría datos sin que el código de aplicación lo detecte.

No hay hallazgos CRÍTICOS explotables. El de mayor impacto potencial (ALTO) es la página de
calendario del portal, que no filtra por cliente en la capa de aplicación y depende
exclusivamente de RLS.

---

## ALTO

### A1 — Página de calendario del portal sin filtro de aplicación por cliente
`app/(portal)/portal/calendario/page.tsx:46-50`

```ts
const { data } = await (supabase as any)
  .from('calendar_events')
  .select('id, title, type, event_date, event_time, notes, projects(title)')
  .order('event_date', { ascending: true })
```

La query NO incluye `.eq('client_id', ...)` ni filtra por el proyecto/cliente del usuario.
A diferencia de las demás páginas del portal (`invoices`, `deliverables`, `archivos`,
`rendimiento`, `projects/[id]`) que sí filtran explícitamente por `client.id`, aquí la única
barrera es la política RLS `"calendar_events: client read own"`
(`supabase/migrations/20260608010000_calendar_events.sql:42-43`), que restringe a
`client_id IN (SELECT id FROM clients WHERE profile_id = auth.uid())`.

Impacto: hoy RLS contiene la fuga. Pero si esa política se modifica/elimina en una migración
futura, o si el cliente se construye alguna vez con service-role, todos los clientes verían
todos los eventos de la agencia. Además el cast `(supabase as any)` (línea 46) anula el chequeo
de tipos y oculta este tipo de errores.

Recomendación: añadir filtro explícito por el `client.id` del usuario en la query (resolver el
`client_id` igual que las otras páginas del portal) y eliminar el cast `as any` proveyendo el
tipo correcto.

---

## MEDIO

### M1 — Acciones de portafolio sin `requireAdmin()` ni validación de input
`src/lib/actions/portfolio.ts:23,31,42,50` (`createPortfolioVideo`, `updatePortfolioVideo`,
`deletePortfolioVideo`, `togglePortfolioVideoVisibility`)

Estas server actions usan `createClient()` (RLS) y NO llaman `requireAdmin()`, a diferencia de
todas las demás acciones de administración del proyecto. La autorización depende únicamente de
la política RLS `"admin_team_all"` de `portfolio_videos`
(`supabase/migrations/20260415000000_portfolio_videos.sql:20-23`), que exige `is_admin_team =
true`.

Impacto: hoy no es escalable (un usuario no-admin obtiene fallo de RLS). Pero:
1. Rompe la regla del proyecto (CLAUDE.md: "server actions must independently verify via
   `requireAdmin()`") — inconsistencia que invita a futuros errores.
2. Sin `requireAdmin()`, un usuario no-admin que invoque la action recibe un error de RLS poco
   claro en lugar de una negación de autorización explícita.
3. No hay validación/caps de longitud en `parseVideoForm` (`portfolio.ts:6-21`): `title`,
   `description`, `vimeo_id`, `cover_url`, etc. se insertan sin límites ni saneo (a diferencia
   de `cotiza.ts`, que sí impone caps). `cover_url` se guarda crudo y luego se consume en el
   sitio público.

Recomendación: añadir `const auth = await requireAdmin()` al inicio de cada action (y usar
`createServiceClient()` como el resto, o conservar RLS pero verificando autz primero), y aplicar
validación/caps de longitud y validación de `cover_url`/`vimeo_id`.

### M2 — Endpoint público `submitCotizacion` sin rate-limit ni honeypot
`src/lib/actions/cotiza.ts:5,39-51`

Endpoint público y no autenticado que escribe en `leads` con `createServiceClient()`
(bypass RLS). Tiene validación de email y caps de longitud (bien, líneas 21-37), pero no hay
ningún control anti-abuso: ni rate-limiting, ni honeypot, ni CAPTCHA. Un atacante puede inundar
la tabla `leads` (spam/DoS lógico) y disparar emails de notificación al admin si ese flujo se
conecta.

Impacto: abuso/spam de la tabla `leads` y posible amplificación de correo. El uso de
service-role aquí es intencional (insert público controlado) y los campos están acotados, por
eso es MEDIO y no ALTO.

Recomendación: agregar honeypot (campo oculto) y/o rate-limit por IP en `proxy.ts` o en la
action; considerar verificación de email diferida antes de notificar.

### M3 — `updateMyProfile` permite editar cualquier columna restringida sólo por código
`src/lib/actions/invite-team-member.ts:18-40`

`updateMyProfile` no usa `requireAdmin()` (correcto, es self-service), valida el usuario con
`createClient().auth.getUser()` y luego escribe con `createServiceClient()` (bypass RLS)
acotando por `.eq('id', user.id)`. El alcance está bien limitado al propio perfil, pero:

- Usa `as unknown as Record<string, unknown>` (línea 33) para el `update`, lo que anula el
  tipado y permitiría, ante un cambio futuro del objeto, escribir columnas sensibles
  (p. ej. `is_admin_team`, `role`) sin que el compilador avise. Hoy sólo escribe `full_name` y
  `avatar_url`, así que no es explotable, pero el patrón es frágil porque corre con service-role.

Recomendación: tipar el `update` correctamente (sin `as unknown as`) para que el conjunto de
columnas editables quede acotado por el tipo y no por convención.

---

## BAJO / Observaciones

- **`createClient` (clients.ts) y otras actions de admin sin caps de longitud**:
  `src/lib/actions/clients.ts:35-48` (y varias en `leads.ts`, `invoices.ts`, `proposals.ts`)
  validan presencia de campos obligatorios pero no imponen límites de longitud en `email`,
  `company`, `notes`, etc. Bajo riesgo porque están detrás de `requireAdmin()`, pero conviene
  homogeneizar con los caps de `cotiza.ts`.
- **`sendTestEmail`** (`src/lib/actions/test-email.ts:5-24`): protegido por `requireAdmin()`;
  el destino `to` es arbitrario, pero sólo accesible a admins, por lo que el riesgo de uso como
  open-relay queda acotado a personal interno. Aceptable; vigilar si el panel se expone a roles
  menos privilegiados.
- **Casts `as any` sobre el cliente Supabase**: `src/lib/actions/calendar.ts` (varias líneas,
  p. ej. `setCalendarEventStatus`/`deleteCalendarEvent`) y la página de calendario del portal
  usan `(db as any)` / `(supabase as any)`. No es una vulnerabilidad directa pero degrada las
  garantías de TypeScript strict y puede ocultar errores de filtrado/escritura. Generar/actualizar
  los tipos de `calendar_events` en `src/lib/supabase/types.ts` para eliminarlos.
- **Cron** (`app/api/cron/reminders/route.ts:9`): correctamente exige
  `Authorization: Bearer ${CRON_SECRET}` antes de usar `createServiceClient()`. OK.
- **Export CSV** (`app/api/export/projects/route.ts:55-67`): correctamente llama
  `requireAdmin()` (401 si falla) antes de `createServiceClient()` y valida el parámetro
  `period` contra una lista blanca. OK.
- **ClientUploader** (`src/components/portal/ClientUploader.tsx`): es cliente de navegador con
  la anon key; inserta en `client_uploads` pasando `clientId` como prop. La política RLS
  `"client_own_uploads"` tiene `WITH CHECK (client_id IN (SELECT id FROM clients WHERE
  profile_id = auth.uid()))` (`supabase/migrations/20260421000000_missing_tables.sql:154-158`),
  por lo que un `clientId` arbitrario en el prop NO permite escribir para otro cliente. OK.

---

## Inventario de cumplimiento (service-role + requireAdmin)

Todas las server actions de administración revisadas que usan `createServiceClient()` llaman
`requireAdmin()` antes de tocar datos:

`calendar.ts`, `categories.ts`, `client-types.ts`, `clients.ts`, `deliverables.ts`,
`expenses.ts`, `invite-team-member.ts` (excepto `updateMyProfile`, self-service intencional —
ver M3), `invoices.ts`, `leads.ts`, `notifications.ts`, `photos.ts`, `projects.ts`,
`proposals.ts`, `send-lead-email.ts`, `team.ts`, `test-email.ts`.

Excepciones intencionales (no admin):
- `cotiza.ts` — endpoint público (ver M2).
- `portal.ts` — acciones de cliente; verifican propiedad vía `resolveClientId()` +
  `verifyDeliverableOwnership()` antes de usar service-role (`src/lib/actions/portal.ts:11-52`).
  Correcto.
- `portfolio.ts` — usa RLS sin `requireAdmin()` (ver M1).
