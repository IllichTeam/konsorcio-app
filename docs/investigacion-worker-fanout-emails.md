# Investigación: fanout de emails de expensas sin queue SaaS

Fecha: 2026-07-21  
Alcance: ~50–100 emails con PDF vía Resend `emails.send`, uno-a-uno, concurrencia ≤10. Next.js en Vercel (asumir Pro). Filas DB por destinatario (`pending|sent|failed`) + UI con polling ya planificadas.

---

## Veredicto (5 líneas)

1. **Sí se puede evitar Upstash / Inngest / Trigger / QStash** para este volumen.
2. El patrón barato: **Postgres como cola** (`pending` + `FOR UPDATE SKIP LOCKED`) + un **runner** que no bloquee la mutation HTTP.
3. En Vercel Pro, el runner viable sin SaaS extra es **`after()` + `maxDuration` alto** y/o un **Cron cada minuto** que drena pendientes.
4. Un “worker local” (`pnpm worker:…` / systemd / custom server) **no corre en Vercel serverless**.
5. Para MVP (~50): `after()` basta si el fanout cabe en `maxDuration`; para fiabilidad a 100+ o PDFs lentos: **cron drain** (con o sin `after()` como kick).

---

## 1. Opciones Vercel-only

### 1.1 `after()` (Next.js) / `waitUntil` (Vercel)

|                                             |                                                                                                                                                                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Qué hace**                                | Responde ya; el callback sigue en la **misma invocación** vía `waitUntil`.                                                                                                                                                                                    |
| **API**                                     | Preferir `after` de `next/server` (estable desde Next 15.1). `waitUntil` de `@vercel/functions` es el primitivo; Vercel recomienda `after` en Next ≥15.1.                                                                                                     |
| **Duración**                                | Acotada al `maxDuration` de **esa** ruta/función. No es un job durable fuera de la invocación.                                                                                                                                                                |
| **Límites Pro (Fluid Compute, default on)** | Default **300s**; máximo GA **800s**; extendido beta **1800s** (Node/Python soportados, config por función). Hobby: tope **300s**.                                                                                                                            |
| **Pros**                                    | $0 infra extra; UX inmediata; encaja con “mutation crea filas → UI poll”; un solo deploy.                                                                                                                                                                     |
| **Contras**                                 | Si la instancia muere / timeout a mitad → quedan `pending` sin retry automático de plataforma. Docs lo posicionan para side-effects (logs/analytics), no como cola.                                                                                           |
| **¿Cubre 50–100 Resend?**                   | **Sí en wall-clock típico**: con concurrencia 10, ~5–10 “olas”; si cada `send`+I/O es ~0.5–3s → orden de **decenas de segundos**, muy por debajo de 300s. Riesgo real = **generación PDF pesada por destinatario** o rate limits Resend, no el techo de 800s. |

**Confiabilidad si “freeza”:** Vercel no garantiza reanudación; `after` solo extiende la vida de la invocación hasta `maxDuration`. Tras kill/timeout, el trabajo no continúa solo — hace falta **idempotencia + re-drain** (cron o reintento manual).

### 1.2 Fluid compute / “background functions” / `maxDuration` largo

- **Fluid compute** (default): billing Active CPU (pausa en I/O) + memoria provisionada; permite reutilizar instancias. No inventa un worker infinito.
- **No hay** un producto separado “background function forever” gratis: el trabajo post-response **sigue siendo la misma Function** con `after`/`waitUntil`.
- Para “ilimitado en el tiempo” Vercel apunta a **Workflows** (otro producto, fuera del scope “cero SaaS extra”).
- Subir `maxDuration` (p.ej. 300–800) en la route/server action del fanout es lo que hace viable el drain en un solo shot.

### 1.3 Cron (`vercel.json` crons) drenando `pending`

|                          |                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Costo SaaS**           | Cron **incluido** en el plan. Cobra como **invocaciones de Function** (CPU/memoria), no hay fee aparte de “cron”.                                                    |
| **Pro**                  | Hasta **100 crons/proyecto**; intervalo mínimo **1 minuto**; precisión al minuto.                                                                                    |
| **Hobby**                | Máx. **1 vez/día**; expresiones más frecuentes **fallan el deploy**. Imprescindible Pro para poll cada minuto.                                                       |
| **Pros**                 | Durable a escala MVP: si un run corta, el siguiente recoge `pending`. Desacopla mutation del envío. $0 queue vendor.                                                 |
| **Contras**              | Latencia hasta ~1 min antes del primer drain; cron “vacío” cada minuto = invocaciones (baratas a este volumen). Auth: proteger con `CRON_SECRET` / header de Vercel. |
| **Duración del handler** | Igual que cualquier Function (`maxDuration`). Un cron puede procesar un batch y salir; el resto queda para el próximo tick.                                          |

Encaja perfecto con filas `pending|sent|failed` + UI polling.

### 1.4 Self-invoke / fire-and-forget a `/api/.../process`

|               |                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Idea**      | Mutation hace `fetch(processUrl)` sin await / o con `after(() => fetch(...))`.                                                                                                                                                                                                                                                                                                                          |
| **Caveats**   | `fetch` sin `waitUntil`/`after` en serverless **puede cortarse** al terminar la response. Cold start del segundo handler. Auth obligatoria (no exponer process público). Misma factura de duración en el **worker** route. Dos invocaciones en cadena ≠ más confiabilidad que un solo `after` con el loop adentro, salvo que el process route tenga su propio `maxDuration` y el cron también lo llame. |
| **Veredicto** | Útil si querés separar “API corta” vs “API larga”; no supera a **cron + SKIP LOCKED** en durabilidad. Evitar “fire-and-forget crudo” sin `after`.                                                                                                                                                                                                                                                       |

---

## 2. Qué NO es “worker local en Vercel”

| Enfoque                                                         | ¿En Vercel serverless?                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm worker:expense-emails` + `node` / forever / systemd / PM2 | **No.** Solo self-host / VPS / container siempre-on.                     |
| Next.js **custom server**                                       | **Incompatible** con el modelo de deploy de Vercel.                      |
| Proceso long-lived en el mismo repo                             | El código puede vivir en el repo; el **runtime** no es Vercel Functions. |

“Local worker” ≠ “deployable a Vercel” a menos que salgan de serverless (Docker en otro host, Railway, Fly, etc.) — eso ya es otro costo/ops.

---

## 3. Postgres-as-queue (sin Redis)

Patrón:

```sql
BEGIN;
SELECT id FROM expense_email_recipients
WHERE status = 'pending'
ORDER BY id
FOR UPDATE SKIP LOCKED
LIMIT 10;
-- send Resend, UPDATE sent|failed
COMMIT;
```

| Quién corre el loop                           | Notas                                             |
| --------------------------------------------- | ------------------------------------------------- |
| **`after()`** en la mutation                  | Kick inmediato; un solo shot hasta `maxDuration`. |
| **Cron 1/min**                                | Safety net + único runner más simple.             |
| **Route process** (cron y/o after lo invocan) | Misma lógica de claim; auth compartida.           |
| **Worker externo**                            | Solo si hay host propio.                          |

**Costo infra:** $0 más allá de Supabase + Vercel ya contratados.  
**Requisitos:** claim atómico (`SKIP LOCKED`), timeouts de claim (`processing` + `locked_at` o equivalente) para no clavar filas, idempotencia ante doble send.

---

## 4. Costos relativos (honesto, orden de magnitud)

Escenario: unos pocos envíos masivos/mes (consorcios chicos), no millones de msgs.

| Path                                    | Costo extra SaaS                                                                | Costo Vercel                                              | Riesgo operativo                                        |
| --------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| **Nada** (fanout dentro de la mutation) | $0                                                                              | Bajo                                                      | **Timeout HTTP / UX rota** — descartado                 |
| **`after()` + maxDuration**             | $0                                                                              | 1 invocación larga; Active CPU mayormente en I/O (barato) | Timeout/crash mid-fanout → `pending` huérfanos sin cron |
| **Cron drain 1/min**                    | $0 fee cron; ~43k invocaciones/mes si siempre prende                            | Céntimos a pocos $ si el handler es no-op rápido          | Latencia ≤1 min; muy robusto con SKIP LOCKED            |
| **`after()` kick + cron safety**        | $0                                                                              | Suma de ambos (aún despreciable)                          | Mejor costo/fiabilidad del set                          |
| **QStash free**                         | $0 hasta **1000 msgs/día** (soft); free: parallelism bajo, HTTP duration 15 min | + invocaciones de tus endpoints                           | Vendor + cuenta + retries; **no necesario** a 50–100    |
| **QStash pay-as-you-go**                | ~$1 / 100k msgs                                                                 | Idem                                                      | Overkill para MVP                                       |

**Cuándo se rompe el path free/built-in:**

- Fanout + PDF gen **> `maxDuration`** en un solo `after` sin batching/cron.
- Hobby sin Pro → no podés cron cada minuto.
- Muchos consorcios disparando a la vez sin claim → contención (SKIP LOCKED lo mitiga).
- Necesidad de DLQ/retries/schedules complejos multi-paso → ahí sí queue/workflow SaaS empieza a pagar.

---

## 5. Recomendación MVP vs después

### MVP (~50 destinatarios, costo mínimo)

1. Mutation: inserta recipients `pending`, responde OK (UI poll).
2. **`after()`** en esa mutation (o route dedicada) drena con concurrencia ≤10 + `maxDuration` ≥300 (800 si PDFs pesados).
3. Opcional pero barato: **cron `*/1 * * * *`** al mismo drain como red de seguridad.
4. **No** Upstash / Inngest / Trigger para este caso.

### Después (100+, más consorcios, PDFs más lentos, menos “hope”)

- Cron (o solo cron) como **única fuente de verdad** del loop; `after()` solo como kick opcional.
- Batch por tick (`LIMIT N`) para no depender de un solo shot de 10+ min.
- Si aparece orquestación multi-paso / sleep largo / fan-in: reevaluar Workflows o QStash — no antes.

### ¿Pueden evitar Upstash enteramente?

|                       |                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Ahora (50–100)**    | **Sí.**                                                                                                                    |
| **Hasta cuándo**      | Mientras un drain por Function (≤800s GA / 30 min beta) + Postgres claim cubra el trabajo, o el cron fraccione el backlog. |
| **Cuándo replantear** | Miles de emails/job, necesidad fuerte de retries/DLQ externos, o salir de Vercel Functions hacia workers siempre-on.       |

---

## Fuentes

- Next.js `after`: https://nextjs.org/docs/app/api-reference/functions/after
- Vercel `@vercel/functions` / `waitUntil` vs `after`: https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package
- `maxDuration` / límites Pro (300 default, 800 max, 1800 extended beta): https://vercel.com/docs/functions/configuring-functions/duration
- Function limits: https://vercel.com/docs/functions/limitations
- Changelog 30 min: https://vercel.com/changelog/vercel-functions-can-now-run-up-to-30-minutes
- Cron usage & pricing (incluido; Pro = 1/min): https://vercel.com/docs/cron-jobs/usage-and-pricing
- Cron 100/proyecto: https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan
- QStash pricing (free 1000 msgs/day): https://upstash.com/pricing/qstash

_Cuotas verificadas contra docs oficiales el 2026-07-21; el extended 1800s está en beta y exige config por función + runtimes Node/Python soportados._
