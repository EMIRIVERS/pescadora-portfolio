# P1 — Sistema de notificaciones (in-app + email)

Estado: **DISEÑO**. Este documento es un plan; no se modificó código de aplicación.
Fecha: 2026-06-08. Autor: subagente P1-notificaciones.

---

## 0. Hallazgo crítico (leer primero)

La tabla `notifications` **NO existe todavía** en el esquema:

- No hay migración que la cree (`grep -rn notification supabase/migrations/` → vacío).
- No aparece en `src/lib/supabase/types.ts` (tipos generados).
- Sin embargo, ya hay UI y acciones que la asumen:
  - `src/components/admin/NotificationBell.tsx` (campana en el dashboard, hace polling cada 30 s vía `getNotifications`).
  - `src/lib/actions/notifications.ts` con `getNotifications / markAsRead / markAllAsRead / createNotification`, todas accediendo a la tabla con `(db as any).from('notifications')` y `eslint-disable @typescript-eslint/no-explicit-any`.

Por lo tanto **el primer paso obligatorio es crear la tabla** (migración) y regenerar
los tipos para eliminar los `as any`. El resto del sistema (disparadores y emails)
se construye encima.

Forma que la UI/acciones esperan (contrato actual a respetar):

```
id           uuid pk
title        text  (NOT NULL)
body         text  (nullable)
type         'info' | 'success' | 'warning' | 'error'   (default 'info')
entity_type  text  (nullable)  -- 'project' | 'client' | 'lead' | 'invoice' | ...
entity_id    uuid/text (nullable)
is_read      boolean (default false)
created_at   timestamptz (default now())
```

`NotificationBell.tsx` ya enruta por `entity_type`:
`project→/admin/projects/:id`, `client→/admin/clients/:id`, `lead→/admin/leads`,
`invoice→/admin/invoices`. El diseño respeta esos `entity_type`.

---

## 1. Principio de arquitectura: dónde vive cada disparo

Regla general para este proyecto:

| Mecanismo | Cuándo usarlo |
|---|---|
| **Server action** (TypeScript, en `src/lib/actions/*`) | Cuando el evento ya pasa por una acción admin/portal y necesitamos **enviar email** (Resend vive en Node, `src/lib/email`) y/o crear la fila in-app con contexto rico (URLs, nombres). Es la vía **preferida** aquí porque el email solo se puede mandar desde el runtime de Next, no desde Postgres. |
| **Trigger de Postgres** | Solo para **espejo in-app garantizado** cuando un cambio de estado puede ocurrir por rutas múltiples o fuera de una acción (p. ej. updates directos, RLS del portal, scripts). El trigger **solo escribe en `notifications`** (nunca manda email; Postgres no tiene acceso a Resend sin `pg_net`/webhooks, que añadirían infra no aprobada). |
| **Cron** (`/api/cron/reminders`) | Eventos **basados en tiempo** que nadie dispara con una acción: facturas vencidas, eventos de calendario próximos, (ya existente) deadlines de proyecto y leads estancados. |

Decisión de fondo: **email siempre desde server action o cron** (nunca desde trigger).
**In-app** puede venir de server action o de trigger; cuando el evento ya tiene una
acción dedicada, se hace en la acción (un solo lugar, contexto completo) y **no** se
duplica con trigger. Los triggers se reservan para los pocos cambios de estado que
podrían no pasar por una acción.

Esto evita añadir dependencias (CLAUDE.md prohíbe npm nuevos) y mantiene Resend como
único canal de email, ya integrado.

---

## 2. Catálogo de eventos

Leyenda destinatario: **Admin** = equipo (`notifications` in-app + email a `ADMIN_EMAIL`).
**Cliente** = email al contacto del cliente/lead (el cliente no usa la campana admin; su
"in-app" es el portal, que ya muestra estado en vivo — ver §6).

| # | Evento | Disparo | In-app (admin) | Email | Destinatario email | `type` / `entity_type` |
|---|--------|---------|:---:|:---:|---|---|
| E1 | **Factura enviada** (`invoices.status` → `sent`) | Server action `updateInvoiceStatus` / `createInvoice` con status sent | Sí | Sí | Cliente (contacto de `clients`) | `info` / `invoice` |
| E2 | **Factura vencida** (`due_date < hoy` y status `sent`) | **Cron** (idempotente, marca `status='overdue'`) | Sí | Sí | Cliente + Admin | `warning` / `invoice` |
| E3 | **Factura pagada** (`invoices.status` → `paid`) | Server action `updateInvoiceStatus` | Sí | Sí (recibo/gracias) | Cliente | `success` / `invoice` |
| E4 | **Cotización aceptada** (`proposals.status` → `accepted`) | Server action `updateProposalStatus` | Sí | Sí (aviso interno) | Admin | `success` / `client` (→ cliente asociado) o sin entity |
| E5 | **Entrega aprobada** (`approveDeliverable`, portal) | Server action `approveDeliverable` | Sí | Sí | Admin | `success` / `project` |
| E6 | **Entrega rechazada** (`rejectDeliverable`, portal) | Server action `rejectDeliverable` | Sí | Sí (con feedback) | Admin | `warning` / `project` |
| E7 | **Evento de calendario próximo** (`event_date` = hoy/mañana, status `pendiente`) | **Cron** | Sí | Sí (resumen diario) | Admin | `info` / sin entity (calendar no tiene página de detalle) |
| E8 | **Nuevo lead** (`createLead` / `submitCotizacion`) | Server action (ya manda email admin; falta in-app) | Sí | Sí (ya existe `leadAdminNotifyTemplate`) | Admin (+ welcome al lead, ya existe) | `info` / `lead` |

Notas por evento:

- **E1/E3 (factura enviada/pagada):** hoy `invoices` no manda email. Hay que añadir el
  envío en `updateInvoiceStatus` (y opcionalmente en `createInvoice` cuando se crea
  ya `sent`). El email al cliente requiere resolver el contacto vía
  `invoices.client_id → clients.email`. In-app admin para que el equipo vea el cambio.
- **E2 (factura vencida):** es **temporal**, va en el cron. El cron además **promueve**
  `sent → overdue` (la migración de invoices ya contempla `overdue` en el CHECK). Evitar
  duplicados: solo notificar la primera vez que cruza a `overdue` (ver §4, dedupe).
- **E4 (cotización aceptada):** `proposals` no manda email hoy. Como `accepted` lo marca
  normalmente el equipo (no hay portal de propuestas para el cliente), el email es
  **interno** al admin + in-app. Si más adelante el cliente acepta desde un enlace
  público, se añade trigger de respaldo.
- **E5/E6 (entrega aprobada/rechazada):** las acciones del portal ya existen
  (`approveDeliverable`, `rejectDeliverable` en `src/lib/actions/portal.ts`) y **ya
  actualizan** `status`/`client_feedback`. Falta: crear notificación in-app admin +
  email al equipo. Como el portal es la única vía y pasa por la acción, **no** se necesita
  trigger; pero se añade un trigger de respaldo opcional (ver §3) por seguridad.
- **E7 (evento de calendario próximo):** `calendar_events` tiene `event_date date` y
  `status ('pendiente'|'hecho')`. El cron busca eventos `pendiente` con
  `event_date ∈ [hoy, hoy+1]` y manda un resumen diario al admin + filas in-app.
- **E8 (nuevo lead):** `createLead` y `submitCotizacion` **ya** mandan
  `leadAdminNotifyTemplate` al admin y `leadWelcomeTemplate` al lead. **Solo falta** la
  fila in-app (`createNotification('Nuevo lead', …, 'info', 'lead', lead.id)`).

---

## 3. Triggers de Postgres (in-app garantizado, sin email)

Se proponen **mínimos**, solo donde el cambio de estado podría no pasar por una acción
o donde queremos garantía a nivel DB. Cada trigger inserta en `notifications` y nada más.

Función genérica:

```sql
create or replace function public.notify_admin(
  p_title text, p_body text, p_type text,
  p_entity_type text, p_entity_id uuid
) returns void language sql security definer set search_path = public as $$
  insert into public.notifications (title, body, type, entity_type, entity_id)
  values (p_title, p_body, p_type, p_entity_type, p_entity_id);
$$;
```

Triggers candidatos (todos `AFTER UPDATE/INSERT ... FOR EACH ROW`):

1. **`deliverables` aprobación/rechazo (respaldo de E5/E6):** `AFTER UPDATE ON
   project_deliverables WHEN (old.status is distinct from new.status AND new.status IN
   ('approved','review'))` → inserta in-app. Sirve si el cliente cambia el estado por una
   ruta que evite la acción. **El email sigue en la acción** (E5/E6).
2. **`invoices` pagada (respaldo de E3):** `AFTER UPDATE ... WHEN new.status='paid' AND
   old.status<>'paid'`.
3. **`proposals` aceptada (respaldo de E4):** `AFTER UPDATE ... WHEN new.status='accepted'
   AND old.status<>'accepted'`.

Importante para evitar **doble notificación** (trigger + acción):

- Opción A (recomendada): los triggers se marcan como **respaldo** y la acción **no**
  crea la fila in-app cuando existe trigger; la acción solo manda email. Así una sola
  fila in-app por evento.
- Opción B: la acción crea la fila in-app y **no** se instala el trigger correspondiente.
  Se usa B para E5/E6/E3/E4 si se prefiere contexto rico (nombres/URLs) en `body`, ya que
  el trigger SQL no tiene fácil acceso a joins legibles.

**Recomendación final:** usar **Opción B** (in-app desde la acción) para E1–E8 por
contexto, y dejar los triggers de §3 como **migración opcional comentada/aparte** que se
activa solo si se detecta que algún cambio de estado evade las acciones. Esto minimiza
duplicados y mantiene un único lugar de verdad (las acciones).

Los triggers, si se activan, deben añadir `notifications` a la `supabase_realtime`
publication (ver §5) para que la campana reciba CDC en vivo.

---

## 4. Cron `/api/cron/reminders` — ampliación

Archivo: `app/api/cron/reminders/route.ts`. Ya valida `Bearer CRON_SECRET`, usa
`createServiceClient()` y corre **diario 09:00 UTC** (`vercel.json`). Hoy hace: deadlines
de proyecto (email admin) + cuenta leads estancados. Se amplía a:

### 4.1 Facturas vencidas (E2)
```
SELECT id, invoice_number, amount, currency, due_date, status, client_id
FROM invoices
WHERE status = 'sent' AND due_date < CURRENT_DATE;
```
Por cada una:
1. `UPDATE invoices SET status='overdue' WHERE id=...` (promoción de estado; idempotente
   porque solo seleccionamos `status='sent'`).
2. `createNotification`-equivalente in-app admin: `type='warning'`, `entity_type='invoice'`.
3. Email al cliente (`clients.email` vía `client_id`) + resumen al admin.

Dedupe: como pasamos `sent → overdue`, una factura solo entra **una vez** al filtro.
No se requiere columna extra. (Si en el futuro hay recordatorios repetidos de vencidas,
añadir `last_overdue_notified_at`.)

### 4.2 Eventos de calendario próximos (E7)
```
SELECT id, title, event_date
FROM calendar_events
WHERE status = 'pendiente'
  AND event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '1 day';
```
→ un email-resumen diario al admin + una fila in-app por evento (`type='info'`, sin
`entity_type` porque no hay página de detalle de calendario; o `entity_type='project'`
si el evento referencia proyecto — el esquema actual de `calendar_events` no liga
proyecto, así que sin entity).

Dedupe diario: el cron corre 1×/día; para evitar repetir el mismo evento ambos días
(hoy y como "mañana" el día anterior), notificar solo cuando `event_date = CURRENT_DATE`
para in-app, y usar el rango `[hoy, mañana]` solo para el email-resumen. Alternativa:
columna `reminded_at date` en `calendar_events` (migración aditiva opcional).

### 4.3 Respuesta del cron
Extender el JSON de salida con `overdueInvoices` y `upcomingEvents` (además de los
campos actuales `deadlineProjects`, `staleLeads`). Mantener el patrón de **devolver 200**
ante error transitorio para no marcar el cron como fallido.

Frecuencia: el diario actual (`0 9 * * *`) cubre E2 y E7. No se cambia `vercel.json`
salvo que se quiera mayor frecuencia (no necesario para P1).

---

## 5. Migraciones a crear (`supabase/migrations/`)

Timestamp **posterior a `20260608030000`** y **posterior** a la última existente
(`20260608050000_realtime.sql`). Aditivas. **No aplicar** (sin credenciales): solo crear
los `.sql`.

### M1 — `20260608060000_notifications.sql` (OBLIGATORIA, base de todo)
- `CREATE TABLE IF NOT EXISTS public.notifications` con la forma de §0.
  - `type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error'))`.
  - `entity_id uuid` (la UI lo trata como string; uuid es compatible al serializar).
  - Índices: `(is_read)`, `(created_at desc)`, `(entity_type, entity_id)`.
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policy `admin_all_notifications`
  (mismo patrón `EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND is_admin_team)`).
  Las inserciones del cron/acciones usan `createServiceClient()` (bypass RLS), así que la
  policy solo necesita cubrir lectura/markRead del admin.
- Añadir a realtime: guardado idempotente con `pg_publication_tables`
  `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;`
  (mismo patrón que `20260608050000_realtime.sql`) para que la campana migre de polling a
  CDC en el futuro (mejora opcional, ver §6).
- Función `notify_admin(...)` de §3 (se deja creada aunque los triggers queden opcionales).

### M2 — `20260608070000_notification_triggers.sql` (OPCIONAL, respaldo)
- Triggers de §3 (deliverables/invoices/proposals) **solo** si se elige Opción A. Por
  defecto **no se activa** (se documenta como respaldo). Si se omite, no se crea el archivo.

### M3 — (opcional) columnas de dedupe
- `ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS reminded_at date;`
- `ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_overdue_notified_at date;`
- Solo si se requieren recordatorios repetidos; **no necesario** para el P1 mínimo.

Tras crear M1, **regenerar tipos**:
`npx supabase gen types typescript ... > src/lib/supabase/types.ts` (requiere credenciales;
queda como paso pendiente del operador). Eso elimina los `(db as any)` de
`notifications.ts`.

---

## 6. Archivos de aplicación a tocar (fuera de este doc — pendiente de implementación)

Este plan **no** los modifica; los lista para la fase de implementación.

| Archivo | Cambio |
|---|---|
| `supabase/migrations/20260608060000_notifications.sql` | **Crear** (M1). |
| `supabase/migrations/20260608070000_notification_triggers.sql` | **Crear** opcional (M2). |
| `src/lib/supabase/types.ts` | Regenerar tras M1 (añade tipo `notifications`). |
| `src/lib/actions/notifications.ts` | Quitar `as any` y `eslint-disable` una vez existan tipos. Añadir helper `notifyAdmin(...)` reutilizable y, si hace falta, una variante callable desde cron con `createServiceClient` sin `requireAdmin`. |
| `src/lib/email/templates.ts` | **Añadir** templates: `invoiceSentTemplate`, `invoicePaidTemplate`, `invoiceOverdueTemplate`, `proposalAcceptedTemplate` (admin), `deliverableApprovedTemplate` (admin), `deliverableRejectedTemplate` (admin, incluye feedback), `upcomingEventsTemplate` (resumen). Reusar `baseWrapper/ctaButton/bodyText/esc`. |
| `src/lib/actions/invoices.ts` | En `updateInvoiceStatus`: al pasar a `sent`→ email cliente + in-app (E1); a `paid`→ email cliente + in-app (E3). Resolver email vía `client_id→clients`. |
| `src/lib/actions/proposals.ts` | En `updateProposalStatus`: al pasar a `accepted`→ in-app admin + email interno (E4). |
| `src/lib/actions/portal.ts` | En `approveDeliverable`/`rejectDeliverable`: crear in-app admin + email al equipo (E5/E6). |
| `src/lib/actions/leads.ts` | En `createLead`: añadir fila in-app `'Nuevo lead'` (E8). (El email admin ya existe.) |
| `src/lib/actions/cotiza.ts` | `submitCotizacion`: idem E8 (lead público). Verificar que también dispare el in-app (hoy inserta lead con status `new`). |
| `app/api/cron/reminders/route.ts` | Añadir §4.1 (facturas vencidas) y §4.2 (eventos próximos); ampliar JSON de salida. |
| `src/components/admin/NotificationBell.tsx` | (Opcional) migrar de polling 30 s a suscripción realtime `postgres_changes` sobre `notifications` una vez en la publicación. No bloqueante. |
| `vercel.json` | Sin cambios (cron diario 09:00 UTC ya cubre E2/E7). |

Reglas respetadas: TypeScript strict (sin `any` nuevos — de hecho se eliminan los
existentes al regenerar tipos), `lucide-react` único icon set, sin dependencias npm
nuevas, Resend como único email, estilos inline `var(--dash-*)` en la campana, server
actions en `src/lib/actions/*` con `requireAdmin()`, migraciones aditivas con timestamp
> `20260608030000`, sin aplicar migraciones.

---

## 7. Orden de implementación sugerido

1. **M1** (`notifications.sql`) → regenerar tipos → limpiar `as any` en `notifications.ts`.
   (Desbloquea la campana que hoy lee una tabla inexistente.)
2. Templates de email nuevos en `templates.ts`.
3. E8 (leads in-app) — el más simple, valida el flujo `createNotification` end-to-end.
4. E1/E3 (invoices) y E4 (proposals) en sus acciones.
5. E5/E6 (portal deliverables).
6. Cron: E2 (vencidas) + E7 (calendario).
7. (Opcional) Realtime en la campana; (opcional) triggers de respaldo M2.

---

## 8. Pendientes para activar (operador)

- Aplicar M1 (y M2/M3 si se crean) con `npx supabase db push` / migración en Supabase
  (este agente no tiene credenciales).
- Regenerar `src/lib/supabase/types.ts`.
- Confirmar `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`, `CRON_SECRET` en el entorno
  (sin `RESEND_API_KEY` los emails no-opean silenciosamente — comportamiento ya existente).
- Verificar que `clients` tiene email de contacto utilizable para E1/E2/E3 (si no, los
  emails al cliente se omiten y solo queda el aviso al admin).
