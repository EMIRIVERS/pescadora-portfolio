# Plan de Pruebas — XICO Films

> Estado: **propuesta / no activado**. Este documento NO instala dependencias ni
> crea archivos `.ts` de test. Hoy `package.json` no tiene framework de pruebas
> (`"No test framework is configured"` en CLAUDE.md). Todos los bloques de código
> de abajo son **ejemplos de referencia**: no copiarlos a `*.test.ts` reales hasta
> aprobar e instalar las dependencias, porque importarían paquetes inexistentes y
> romperían `tsc` / `next build`.

---

## 1. Estrategia general

Dos capas, una herramienta para cada trabajo:

| Capa | Framework | Qué cubre | Por qué |
| --- | --- | --- | --- |
| Unit / integración ligera | **Vitest** | Lógica pura: cálculo fiscal CFDI (`src/lib/billing/tax.ts`, `catalog.ts`), helpers (`utils.ts`, `status-colors.ts`, `seo.ts`), reducers de stores Zustand, validaciones de inputs de server actions. | Rápido, sin red, corre en CI en segundos. Compatible con TS strict y el alias `@/*`. La lógica fiscal es determinista y de alto riesgo (dinero) — es el primer candidato. |
| End-to-end | **Playwright** | Flujos de navegador reales contra un Next.js + Supabase efímero: login, gate de admin, crear proyecto, cotización→factura, evento de calendario en portal, y **aislamiento RLS entre clientes**. | Las reglas duras del producto (RLS, `proxy.ts`, `requireAdmin()`) sólo se validan de verdad con sesión, cookies y base de datos reales. Mockear Supabase aquí daría falsos verdes. |

No se elige Jest: Vitest es ESM-first, arranca más rápido, comparte config con el
resto del tooling Vite/ESM y resuelve el alias `@/*` con un solo bloque en config.

### Lo que NO se mockea
- Las políticas RLS se prueban **contra Postgres real** (Supabase local), nunca con
  stubs. Un mock de Supabase no ejecuta las `POLICY ... USING (...)`, que es
  justo lo que se quiere verificar.
- `proxy.ts` (middleware Next 16) se prueba vía navegación e2e (redirects 307),
  no unitariamente.

### Lo que SÍ se mockea (sólo en unit)
- `resend` (envío de email): nunca disparar correo real en tests. Stub de
  `src/lib/email/*` y de `src/lib/actions/send-lead-email.ts`.

---

## 2. Dependencias a aprobar e instalar

**Ninguna se instala todavía** (CLAUDE.md prohíbe añadir deps npm sin aprobación).
Lista a solicitar, todas `devDependencies`:

```
# Unit
vitest
@vitejs/plugin-react          # JSX/TSX en tests de componentes
vite-tsconfig-paths           # resuelve el alias @/* desde tsconfig
@testing-library/react        # (opcional) tests de componentes presentacionales
@testing-library/jest-dom     # (opcional) matchers DOM
jsdom                         # entorno DOM para Vitest

# E2E
@playwright/test
```

Notas de aprobación:
- `xlsx` y `pg` ya están en el repo; `pg` se puede reutilizar para *sembrar* /
  *limpiar* datos en e2e sin añadir un cliente nuevo.
- Tras instalar Playwright hay que correr `npx playwright install --with-deps`
  (descarga binarios de navegador, no es dependencia npm de runtime).

### Scripts a añadir en `package.json` (al activar)

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

`tsc` no debe compilar los tests en build: añadir `**/*.test.ts`,
`**/*.spec.ts` y `e2e/**` a `exclude` de `tsconfig.json` (o un `tsconfig.test.json`
aparte) para que `next build` no los toque.

---

## 3. Configuración (ejemplo — no crear aún)

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],          // habilita @/lib/...
  test: {
    environment: 'node',               // 'jsdom' sólo para tests de componentes
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,                // RLS tests comparten datos sembrados
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_TEST_URL!,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_TEST_ANON_KEY!,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!,
    },
  },
})
```

### Entorno para e2e
- Usar `npx supabase start` (stack local en `supabase/config.toml`) para tener una
  base efímera con todas las migraciones aplicadas — **incluido el reset**, ya que
  e2e sí puede aplicar migraciones localmente (la regla "no apliques migraciones"
  es para producción/sin credenciales, no para el Postgres local de test).
- Un helper de *seeding* con `pg` o `createServiceClient()` (service-role, bypassa
  RLS) crea los usuarios fixture: 1 admin (`is_admin_team = true`), y 2 clientes
  (`Cliente A`, `Cliente B`) cada uno con su `profiles.id = auth.uid()` y su fila
  en `clients (profile_id = ...)`.

---

## 4. Flujos críticos a cubrir

### 4.1 Login + gate de admin (`proxy.ts` + `requireAdmin()`)

Riesgo: que un usuario sin `is_admin_team` llegue a `/admin`, o que un anónimo
acceda a `/portal`. `proxy.ts` redirige y `requireAdmin()` es la segunda barrera
en cada server action.

```ts
// e2e/auth-gate.spec.ts  (EJEMPLO)
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test('anónimo en /admin → redirige a /login con redirectTo', async ({ page }) => {
  await page.goto('/admin/projects')
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fadmin%2Fprojects/)
})

test('cliente (no admin) en /admin → redirige a /portal', async ({ page }) => {
  await loginAs(page, 'clienteA')
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/portal/)
})

test('admin logueado en /login → rebotado a /admin', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.goto('/login')
  await expect(page).toHaveURL(/\/admin/)
})
```

Complemento unit del gate (sin red, mockeando los factories de Supabase):

```ts
// src/lib/supabase/requireAdmin.test.ts  (EJEMPLO)
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))

describe('requireAdmin', () => {
  it('devuelve {error} si no hay usuario', async () => {
    // mock createClient().auth.getUser() → { data: { user: null } }
    // import dinámico tras el mock
    const { requireAdmin } = await import('@/lib/supabase/server')
    const res = await requireAdmin()
    expect(res).toHaveProperty('error')
  })
  // it('devuelve {error} si user existe pero is_admin_team=false')
  // it('devuelve {userId} si is_admin_team=true')
})
```

### 4.2 Crear proyecto (admin)

```ts
// e2e/create-project.spec.ts  (EJEMPLO)
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test('admin crea un proyecto y aparece en la lista', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.goto('/admin/projects')
  await page.getByRole('button', { name: /nuevo proyecto/i }).click()
  await page.getByLabel(/título/i).fill('Spot Tequila 2026')
  await page.getByLabel(/cliente/i).selectOption({ label: 'Cliente A' })
  await page.getByRole('button', { name: /guardar/i }).click()

  await expect(page.getByText('Spot Tequila 2026')).toBeVisible()
  // verificar persistencia: recargar y seguir visible
  await page.reload()
  await expect(page.getByText('Spot Tequila 2026')).toBeVisible()
})
```

### 4.3 Cotización → Factura CFDI (cálculo fiscal + conversión)

Dos niveles. **Unit** (lo más valioso, dinero determinista) sobre `tax.ts`, que ya
documenta sus propios ejemplos en JSDoc:

```ts
// src/lib/billing/tax.test.ts  (EJEMPLO)
import { describe, it, expect } from 'vitest'
import {
  calcTaxBreakdown, sumLineItems, taxFromLineItems,
  DEFAULT_IVA_RATE, RET_ISR_RATE, RET_IVA_RATE,
} from '@/lib/billing/tax'

describe('calcTaxBreakdown', () => {
  it('IVA 16% sin retenciones (persona moral / cotización simple)', () => {
    expect(calcTaxBreakdown(22600)).toEqual({
      subtotal: 22600, iva: 3616, retIsr: undefined, retIva: undefined, total: 26216,
    })
  })

  it('con retenciones ISR 10% + IVA 10.666% (servicios profesionales)', () => {
    expect(calcTaxBreakdown(10000, { applyRetIsr: true, applyRetIva: true })).toEqual({
      subtotal: 10000, iva: 1600, retIsr: 1000, retIva: 1066.6, total: 9533.4,
    })
  })

  it('redondea a 2 decimales (r2)', () => {
    const b = calcTaxBreakdown(333.335)
    expect(b.iva).toBe(53.33)        // 333.34 * 0.16, ya redondeado
  })

  it('tasas SAT MX 2026 son las esperadas', () => {
    expect([DEFAULT_IVA_RATE, RET_ISR_RATE, RET_IVA_RATE]).toEqual([0.16, 0.1, 0.10666])
  })
})

describe('sumLineItems / taxFromLineItems', () => {
  it('suma qty*unitPrice y aplica desglose en un paso', () => {
    const lines = [{ qty: 2, unitPrice: 5000 }, { qty: 1, unitPrice: 2600 }]
    expect(sumLineItems(lines)).toBe(12600)
    expect(taxFromLineItems(lines).total).toBe(14616)   // 12600 + 16%
  })
})
```

**E2E** de la conversión (la factura nace de una propuesta — `invoices.ts` inserta
`proposal_id`): un admin crea una cotización/propuesta, la convierte a factura, y se
verifica que los totales del servidor coinciden con `calcTaxBreakdown` (los totales
se **recalculan en el servidor**, no se confía en el cliente — ver `computeTotals`
en `invoices.ts`).

```ts
// e2e/quote-to-invoice.spec.ts  (EJEMPLO)
test('cotización con servicios → factura con totales CFDI correctos', async ({ page }) => {
  await loginAs(page, 'admin')
  await page.goto('/admin/proposals')
  // ...crear propuesta con líneas del SERVICE_CATALOG, cliente DIRECTO (retenciones)...
  // ...acción "convertir a factura"...
  await expect(page.getByTestId('invoice-total')).toHaveText('$9,533.40')  // ejemplo
})
```

### 4.4 Evento de calendario visible en el portal del cliente

El admin crea un `calendar_event` ligado a un `project`/`client`; la política
`calendar_events: client read own` (USING `client_id IN (clients WHERE profile_id =
auth.uid())`) debe dejar que **ese** cliente lo vea en su portal, derivando el
`client_id` del proyecto (`resolveClientId` en `calendar.ts`).

```ts
// e2e/calendar-portal-visibility.spec.ts  (EJEMPLO)
test('evento creado por admin aparece en el portal del cliente dueño', async ({ browser }) => {
  const admin = await (await browser.newContext()).newPage()
  await loginAs(admin, 'admin')
  await admin.goto('/admin/calendar')
  // crear evento con project de Cliente A, fecha futura
  // ...

  const clientA = await (await browser.newContext()).newPage()
  await loginAs(clientA, 'clienteA')
  await clientA.goto('/portal')
  await expect(clientA.getByText('Rodaje día 1')).toBeVisible()
})
```

### 4.5 RLS — un cliente NO ve datos de otro (regla dura)

El caso de seguridad más importante. Se prueba en **dos niveles**.

**Nivel base de datos** (directo, el más fiable): con un cliente anon/cookie de
Cliente B, intentar leer facturas/eventos de Cliente A → resultado vacío. Esto
ejecuta las policies reales (`invoices: client read own`, `calendar_events: client
read own`).

```ts
// e2e/rls-isolation.spec.ts  (EJEMPLO — vía API/DB, no UI)
import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { signInClient, seedInvoiceFor } from './helpers/db'

test('Cliente B no puede leer facturas de Cliente A', async () => {
  const invoiceA = await seedInvoiceFor('clienteA')           // service-role seed
  const sb = createClient(process.env.SUPABASE_TEST_URL!, process.env.SUPABASE_TEST_ANON_KEY!)
  await signInClient(sb, 'clienteB')                          // sesión RLS de B

  const { data } = await sb.from('invoices').select('*').eq('id', invoiceA.id)
  expect(data).toEqual([])                                    // RLS lo oculta

  const own = await sb.from('invoices').select('*')           // sólo las de B
  expect(own.data?.every(i => i.client_id !== invoiceA.client_id)).toBe(true)
})

test('Cliente B no ve eventos de calendario de Cliente A', async () => {
  // análogo con calendar_events
})
```

**Nivel UI** (defensa en profundidad): logueado como Cliente B, navegar al portal y
confirmar que no aparece ningún dato sembrado para Cliente A (factura, evento,
deliverable).

---

## 5. Matriz de cobertura objetivo

| Flujo | Unit (Vitest) | E2E (Playwright) | Prioridad |
| --- | --- | --- | --- |
| Cálculo fiscal CFDI (`tax.ts`) | ✅ alta | (verificación de totales) | P0 |
| `requireAdmin()` ramas | ✅ | — | P0 |
| Login + gate `proxy.ts` | — | ✅ | P0 |
| RLS aislamiento entre clientes | — | ✅ (DB + UI) | P0 |
| Crear proyecto | (validación input) | ✅ | P1 |
| Cotización → factura | ✅ (totales) | ✅ (conversión) | P1 |
| Evento calendario en portal | — | ✅ | P1 |
| Aprobar/rechazar deliverable (`portal.ts`) | (validación) | ✅ | P2 |
| Helpers (`utils`, `status-colors`, `seo`) | ✅ | — | P2 |

---

## 6. CI (referencia, al activar)

1. `npm ci`
2. `npm run test` (Vitest, sin red — corre siempre).
3. Job aparte para e2e: `npx supabase start` → migraciones aplicadas → seed →
   `npx playwright install --with-deps` → `npm run test:e2e`.
4. Mantener e2e fuera del path de `next build`/`tsc` (exclude en tsconfig) para no
   afectar el despliegue.

---

## 7. Qué falta para activarlo

1. **Aprobar e instalar** las devDependencies de la sección 2 (CLAUDE.md exige
   aprobación explícita para añadir paquetes npm).
2. Crear `vitest.config.ts`, `playwright.config.ts` y `vitest.setup.ts`.
3. Añadir los scripts `test*` a `package.json` y excluir tests de `tsconfig`.
4. Convertir los bloques de ejemplo de este doc en archivos reales bajo
   `src/**/*.test.ts` y `e2e/*.spec.ts`, más helpers `e2e/helpers/auth.ts` y
   `e2e/helpers/db.ts` (login programático + seed/teardown con service-role).
5. Definir variables de entorno de test (`SUPABASE_TEST_*`) y documentar el arranque
   del stack local de Supabase para e2e.
6. (Opcional) Job de CI según la sección 6.

**Hasta completar el paso 1, no crear ningún `*.test.ts`/`*.spec.ts` real**: los
imports a `vitest`/`@playwright/test` no existirían y romperían `tsc`/`next build`.
