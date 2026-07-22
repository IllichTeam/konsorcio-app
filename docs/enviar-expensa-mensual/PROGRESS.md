# PROGRESS — Enviar expensa mensual

Última actualización: 2026-07-22

## Estado global

| Fase | Nombre                            | Status                                                                                        |
| ---- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| 0    | Foundation (schema + storage)     | **done** (artefactos en repo; migrate + bucket manual pend.)                                  |
| 1    | Email path + template attachments | **done** (código; sin tests/preview/envío real ejecutados)                                    |
| 2    | Upload PDFs                       | **done** (código; sin smoke upload / tests ejecutados)                                        |
| 3    | tRPC send + runner background     | **done** (código; sin smoke Resend/DB/tests ejecutados)                                       |
| 4    | Dialog UI                         | **done** (código; sin E2E browser / smoke real ejecutados)                                    |
| 5    | Status + historial UI             | **done** (código; sin E2E / poll smoke / tests ejecutados)                                    |
| 6    | Hardening                         | **verificación código done** (lint/ts/test/build OK; smoke/QA browser/servicios reales pend.) |

**Discovery:** done (2026-07-21). SPEC + PLAN escritos.  
**Review decisions:** done (2026-07-21). C1–C6 + menores cerrados → docs actualizados.  
**UI / maqueta:** done (2026-07-21). Dialog + pantalla de estado cableados; Enviar navega con `sendId` placeholder. Sin Resend ni runner.  
**Fase 0:** done (2026-07-21). Schema Drizzle + Zod + migración generada (no aplicada) + doc Storage.  
**Fase 1:** done (2026-07-21). Template `ExpensaMensual` + `renderExpenseEmailHtml` + `sendExpenseEmail` + concurrency/429 helper. Sin tests ni llamadas a Resend.  
**Fase 2:** done (2026-07-21). Cliente Supabase admin + `POST /api/expense-emails/upload` + helpers signed URL. Sin smoke real ni tests.  
**Fase 3:** done (2026-07-21). Router `expenseEmails` (create / getSend / retryPending / listRecentByConsortium) + runner background vía `after()` + `maxDuration` en tRPC. Sin smoke real ni tests.  
**Fase 4:** done (2026-07-21). Dialog cableado: upload → create → navigate; preview = `expenseEmails.preview` → `renderExpenseEmailHtml`; mensaje sin saludo duplicado. Sin E2E/smoke ejecutados.  
**Fase 5:** done (2026-07-21). Status page con `getSend` + poll + `retryPending`; historial en detalle del consorcio con `listRecentByConsortium`. Sin E2E/smoke ejecutados.  
**Fase 6:** implementación estática done (2026-07-21). Hardening concurrencia/claims, docs env/retention, UX canónica sync.  
**Verificación código (Fase 6):** done (2026-07-22). Lint / typecheck / unit tests / build en verde. **No** migrate remoto, **no** smoke Resend/Storage, **no** QA browser firmado.

---

## Decisión de producto confirmada — maqueta (2026-07-21)

**Cerrada por el usuario.** Conservar la maqueta actual. Las siguientes fases **no** deben volver a preguntar esto ni reabrir el dialog tipo SPEC §3.1 editable.

| Tema           | Comportamiento canónico (maqueta)                                       |
| -------------- | ----------------------------------------------------------------------- |
| Destinatarios  | Solo **Todos** (lista completa de `tenant_emails` del consorcio)        |
| Mensaje        | **Automático** con mes/año (`buildMonthlyExpenseMessage`); sin textarea |
| Link           | Solo lectura (valor `driveLink` del consorcio)                          |
| Alias de cobro | Visible en dialog + preview (solo lectura)                              |

**No altera el schema base** de Fase 0: `expense_email_sends` / `expense_email_recipients` siguen con `body`, `link_url?` y una fila por email. La UI arma el mensaje y manda siempre todos los destinatarios; el contrato Zod acepta la lista explícita para validación server-side.

QA.md (AC-03–AC-08) alineado a la UX canónica (2026-07-21, Fase 4). Las pruebas **no** están marcadas como pasadas.

---

## Hecho — Verificación de código (2026-07-22)

**Status:** lint / typecheck / unit tests / build **OK**. Smoke reales, migrate remoto y QA browser **no** ejecutados / **no** firmados.

### Comandos y resultados

| Comando                                                           | Resultado                                                                                          |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Focalizado: `pnpm exec oxlint` sobre archivos del feature         | Errores corregidos; quedan **warnings** intencionales `no-await-in-loop` (retry/upload secuencial) |
| `pnpm exec tsgo --noEmit -p tsconfig.json`                        | **exit 0**                                                                                         |
| `pnpm lint` (`oxlint`)                                            | **exit 0** (solo warnings `no-await-in-loop`, incl. e2e/perf preexistente)                         |
| Focalizado: `pnpm exec vitest run` sobre tests nuevos del feature | **OK**                                                                                             |
| `pnpm test` (`vitest run`)                                        | **28 files / 124 tests passed** (exit 0)                                                           |
| `pnpm build` (`next build`)                                       | **exit 0** — incluye `/api/expense-emails/upload` y `/consorcios/[id]/envios/[envioId]`            |

No hay script `typecheck` en `package.json`; se usó el equivalente `pnpm exec tsgo --noEmit -p tsconfig.json`.

### Correcciones de código (scope verificación)

- `expenseEmailOptionalLinkUrlSchema`: `string` + refine (`URL.canParse`) en lugar de `z.url() \| ""` (el union brandía el input y rompía tipos tRPC/`NoInfer` en el dialog).
- `run-expense-email-send.ts`: `.returning()` sin selector parcial (API tipada del repo); export de `rollupExpenseEmailSendStatus` / `userFacingExpenseEmailSendError` para tests.
- Lint: `Array.from({ length })` en concurrency; sanitize de filename sin control-regex; `toSorted()` en router; default estable de `attachmentNames` en template.
- Dialog: unwrap explícito de `previewData.html` (workaround tsgo + `NoInfer` de TanStack Query).
- Hooks: input de preview tipado con `inferRouterInputs`; sin `placeholderData` (evita `NoInfer` frágil).
- Tests existentes `emails` / `consortiums`: `vi.mock("server-only")` porque `appRouter` ahora importa el router de expensas.

### Tests añadidos

| Archivo                                                    | Cobertura                                                                    |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/lib/schemas/expense-email.test.ts`                    | constantes, attachment ref, link opcional, create 1–3 PDFs, preview default  |
| `src/lib/storage/expense-emails.test.ts`                   | paths/object key, `isAttachmentRefForSend`, sanitize/colisiones, magic PDF   |
| `src/lib/email/concurrency.test.ts`                        | 429 detect, retry backoff, `mapWithConcurrency` orden/techo                  |
| `src/lib/email/send-expense-email.test.ts`                 | payload Resend mock (`emails.send`), subject/override, `reply_to`, retry 429 |
| `src/lib/email/build-monthly-expense-message.test.ts`      | mensaje auto sin saludo duplicado                                            |
| `src/emails/expensa-mensual.test.tsx`                      | template: `Vecino/a`, alias/link/PDFs                                        |
| `src/server/expense-emails/run-expense-email-send.test.ts` | rollup, errores UI sin URLs, stale/lease                                     |
| `src/server/expense-emails/map-expense-email-dto.test.ts`  | DTO ISO + `sentByUserName`                                                   |
| `src/server/trpc/routers/expense-emails.test.ts`           | path gate, idempotencia queued+reschedule, create set emails, preview        |
| `src/hooks/use-expense-emails.test.ts`                     | labels ES de status                                                          |

### Explicitamente NO aprobado en esta pasada

- QA browser / E2E AC-01…AC-42
- Migrate `0010` (local o prod)
- Bucket Storage remoto / upload smoke
- Envíos Resend reales
- Sign-off MVP en QA.md

### Próximo paso operativo

1. Apply migrate `0010` + bucket + env (otro agente / ops).
2. Smoke Resend/Storage + checklist QA.md cuando se autorice.

---

## Hecho — Fase 6 (2026-07-21) — implementación estática

**Status:** implementación estática done; verificación de código hecha el 2026-07-22 (ver sección anterior).

### Hardening aplicado (código)

- **Validaciones 1–3 PDFs / ≤5 MB / PDF real:** cliente (`FormPdfFiles` + zod dialog) + server upload (MIME/magic `%PDF`, techos) + create Zod `attachmentRefs` 1–3; paths con `isAttachmentRefForSend` más estricto (sin `..`, un solo leaf bajo `{consortium}/{send}/`).
- **Destinatarios:** create sigue exigiendo igualdad exacta con `tenant_emails` activos (`isDeleted = false`).
- **billingEmail vacío** → omite `reply_to`; subject fijo + `[para: …]` con `EMAIL_OVERRIDE_TO`.
- **Signed URLs:** privadas, TTL 6 h, **regeneradas en cada run/retry**; no se loguean URLs ni service role (upload log solo `message`).
- **Idempotencia / concurrencia:**
  - create: PK `sendId` + ack idempotente; si queda `queued`, re-agenda runner.
  - runner: **lease persistido** (`claim_token` + `claim_expires_at`). Un único `UPDATE ... WHERE` reclama `queued`/`partial`/`failed` o `sending` con lease vencido y escribe un token nuevo; PostgreSQL reevalúa la condición tras concurrencia, por lo que solo un runner obtiene `returning()`.
  - fencing: cada claim/outcome de recipient y el rollup exigen el `claim_token` vigente; un runner reemplazado no puede seguir reclamando filas ni finalizar el send.
  - recipient: `attempts` CAS se conserva como defensa adicional; nunca toca `sent`.
- **Lifecycle / poll:** rollup `queued`/`partial`/`sent`/`failed`; pending recuperables; poll se detiene en terminal **o** si `sending` está stale (≥ `EXPENSE_EMAIL_STALE_SENDING_MS`).
- **`after()` / maxDuration:** create responde al toque; fan-out en `after()`; `/api/trpc` `maxDuration = 120`. Gap: docs locales Next no incluyen `after.md` en este install — se usa `after` de `next/server` (patrón ya presente).
- **Demo mode / ES / EN / forms / DataTable / queryOptions:** confirmados; dialog muestra mensaje/link/alias **readonly** + preview.
- **Historial remitente:** `leftJoin` a `user.name` → DTO `sentByUserName` (fallback id corto).
- **Cleanup 60 días:** **no** hay cron/jobs en el repo → procedimiento **manual** en [STORAGE.md](./STORAGE.md). Env vars + bucket documentados ahí y en `.env.example`.

### Docs sync

SPEC / PLAN / QA / README / STORAGE / PROGRESS alineados a UX canónica (Todos, mensaje automático, link/alias readonly). Criterios de QA **no** marcados como pasados (salvo doc de env/bucket en firma).

### Archivos tocados (Fase 6)

- `src/server/expense-emails/run-expense-email-send.ts` — lease token, fencing y claims
- `src/db/schema.ts` + migración/snapshot `0010` — `claim_token` / `claim_expires_at`
- `src/server/trpc/routers/expense-emails.ts` — join user, re-schedule queued
- `src/server/expense-emails/map-expense-email-dto.ts` — `sentByUserName`
- `src/server/expense-emails/schedule-expense-email-send.ts` — notas after/maxDuration
- `src/lib/schemas/expense-email.ts` — stale constant + DTO name
- `src/lib/storage/expense-emails.ts` — path gate
- `src/hooks/use-expense-emails.ts` — poll stale stop
- `src/components/expense-emails/*` + `consortium-detail.tsx` — UX readonly + nombre remitente
- `src/app/api/expense-emails/upload/route.ts` — log seguro
- `src/lib/email/send-expense-email.ts` — error ES vacío
- Docs en `docs/enviar-expensa-mensual/`

### Riesgos residuales (conocidos)

- La exclusión garantiza **un solo lease vigente** y bloquea DB writes del runner reemplazado. No garantiza exactly-once ante el corte inevitable entre Resend y el update DB: si una llamada externa dura más que el lease (2 min), el lease vence y otro runner reclama antes de conocer su resultado, puede existir un duplicado. Resolver ese caso requeriría idempotency key soportada por el proveedor o reconciliación externa.
- Plan Vercel con `maxDuration` < 120s → cortes recuperables vía retry.
- Body multipart vs techo de plataforma (~4.5 MB en algunos planes) vs 3×5 MB.
- Cleanup 60 días manual (sin job).
- Migración `0010` + bucket remoto aún no aplicados.

---

## Hecho — Fase 5 (2026-07-21)

### Pantalla de estado (real)

[`src/components/expense-emails/expense-email-send-status-screen.tsx`](../../src/components/expense-emails/expense-email-send-status-screen.tsx):

- Datos vía `useExpenseEmailSend` → `expenseEmails.getSend` (sin mock).
- Polling TanStack Query (`refetchInterval` 2s) solo mientras `status` es `queued` \| `sending`; se detiene en `sent` / `partial` / `failed`.
- Resumen: total / enviados / fallidos / pendientes + badge de status en español (`En cola`, `Enviando`, `Enviado`, `Parcial`, `Fallido`).
- Loading / error / not-found coherentes (mensaje ES + volver al consorcio).
- `DataTable` de recipients: fecha/hora (`lastAttemptAt`), email, estado, error.
- CTA **Reintentar pendientes**: visible si hay `pending` o `failed`; disabled mientras la mutation corre; anti-spam también en server (`CONFLICT` si `sending` fresco). Toasts ES.
- Invalidación: `getSend` + `listRecentByConsortium` vía `queryFilter` inferido.

### Historial en detalle del consorcio

[`src/components/consortiums/consortium-detail.tsx`](../../src/components/consortiums/consortium-detail.tsx):

- Sección **Envíos de expensa reciente** con `useRecentExpenseEmailSends` → `listRecentByConsortium`.
- Columnas: fecha (link a `/consorcios/[id]/envios/[envioId]`), status, counts, enviado por.
- **Remitente:** DTO expone `sentByUserName` vía `leftJoin` a `user.name` (Fase 6); UI muestra nombre o fallback a id corto.
- Fuera de Notificaciones admin. Oculto en demo mode (misma coherencia que el botón de enviar).

### Hooks

[`src/hooks/use-expense-emails.ts`](../../src/hooks/use-expense-emails.ts):

- `useExpenseEmailSend` — get + poll
- `useRecentExpenseEmailSends` — historial
- `useRetryExpenseEmailPending` — mutation + invalidate + toasts
- `useCreateExpenseEmailSend` — también invalida historial / getSend al crear

### Archivos tocados / nuevos

- `src/hooks/use-expense-emails.ts`
- `src/components/expense-emails/expense-email-send-status-screen.tsx`
- `src/components/expense-emails/expense-email-send-recipient-columns.tsx` (DTO real / `lastAttemptAt`)
- `src/components/expense-emails/expense-email-send-history-columns.tsx` (**nuevo**)
- `src/components/consortiums/consortium-detail.tsx`
- Docs: este PROGRESS

### Pendientes de esta fase (no ejecutados por restricción)

- E2E: create → status poll → terminal; retry pendientes; deep-link refresh
- Smoke historial en consorcio + ausencia en Notificaciones admin
- Lint / typecheck / tests

---

## Hecho — Fase 4 (2026-07-21)

### Dialog cableado

[`src/components/expense-emails/send-monthly-expense-dialog.tsx`](../../src/components/expense-emails/send-monthly-expense-dialog.tsx):

1. Reserva `sendId` en `useRef` **una vez por intento** (no en cada render).
2. `POST /api/expense-emails/upload` multipart (`uploadExpenseEmailPdfs`) con ese `sendId`.
3. Mutation `expenseEmails.create` con `sendId`, `attachmentRefs`, todos los emails activos, mensaje fijo, `driveLink` readonly.
4. Navega a `/consorcios/[id]/envios/[envioId]` con el `sendId` real.
5. Anti doble-click: CTA disabled durante upload/create; cache de upload por fingerprint de archivos → retry de create **no** re-sube si los PDFs no cambiaron.
6. Demo mode: botón sigue oculto en `consortium-detail` (`NEXT_PUBLIC_DEMO_MODE`).

### Preview = mismo template

- Procedure `expenseEmails.preview` → `renderExpenseEmailHtml` (no HTML paralelo).
- Hook `useExpenseEmailPreview` (TanStack Query + tRPC `queryOptions`).
- Iframe `srcDoc` en el dialog; refleja mensaje, link, alias (desde consorcio) y nombres de PDFs.

### Mensaje sin doble saludo

- `buildMonthlyExpenseMessage` movido a [`src/lib/email/build-monthly-expense-message.ts`](../../src/lib/email/build-monthly-expense-message.ts).
- Ya **no** incluye `Hola Vecino/a,` — el template es dueño del saludo fijo.

### Archivos nuevos / tocados

- [`src/hooks/use-expense-emails.ts`](../../src/hooks/use-expense-emails.ts) — preview query + create mutation
- [`src/lib/api/upload-expense-emails.ts`](../../src/lib/api/upload-expense-emails.ts) — cliente multipart
- [`src/lib/email/build-monthly-expense-message.ts`](../../src/lib/email/build-monthly-expense-message.ts)
- Zod: `previewExpenseEmailInputSchema` / `previewExpenseEmailResultSchema`
- Router: `expenseEmails.preview`
- Docs: SPEC §1/§2/§3.1/§10, QA AC-03–AC-08 + guiones, PROGRESS

### Pendientes de esta fase (no ejecutados por restricción)

- E2E browser: dialog → upload → create → status URL
- Smoke preview HTML vs mail real
- Lint / typecheck / tests

---

## Hecho — Fase 3 (2026-07-21)

### Router tRPC `expenseEmails`

Registrado en [`src/server/trpc/routers/_app.ts`](../../src/server/trpc/routers/_app.ts).

| Procedure                              | Tipo     | Input                                                             | Output                            | Notas                                                    |
| -------------------------------------- | -------- | ----------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------- |
| `expenseEmails.preview`                | query    | `previewExpenseEmailInputSchema`                                  | `{ html }`                        | Mismo template que el envío; Fase 4                      |
| `expenseEmails.create`                 | mutation | `createExpenseEmailSendInputSchema` (incluye `sendId` del upload) | `{ sendId }`                      | Gate consortium; insert PK = `sendId`; background runner |
| `expenseEmails.getSend`                | query    | `{ consortiumId, sendId }`                                        | `expenseEmailSendDetailDtoSchema` | Scoped al consorcio; DTO ISO timestamps                  |
| `expenseEmails.retryPending`           | mutation | `{ consortiumId, sendId }`                                        | `{ sendId }`                      | Solo `pending`+`failed`; nunca reenvía `sent`            |
| `expenseEmails.listRecentByConsortium` | query    | `{ consortiumId, limit? }`                                        | `expenseEmailSendDtoSchema[]`     | Historial para Fase 5 (default limit 20)                 |

Archivos:

- [`src/server/trpc/routers/expense-emails.ts`](../../src/server/trpc/routers/expense-emails.ts)
- [`src/server/expense-emails/run-expense-email-send.ts`](../../src/server/expense-emails/run-expense-email-send.ts)
- [`src/server/expense-emails/schedule-expense-email-send.ts`](../../src/server/expense-emails/schedule-expense-email-send.ts)
- [`src/server/expense-emails/map-expense-email-dto.ts`](../../src/server/expense-emails/map-expense-email-dto.ts)

Zod añadido en [`src/lib/schemas/expense-email.ts`](../../src/lib/schemas/expense-email.ts): `expenseEmailSendIdResultSchema`, `listExpenseEmailSendsInputSchema`.

### Semántica create

1. `findAccessibleConsortium` (mismo gate que upload / tenant emails).
2. **Idempotencia por `sendId`:** si ya existe fila con ese PK y mismo `consortiumId` → return `{ sendId }` sin segundo insert ni segundo schedule (anti doble-click / double-submit).
3. Valida cada `attachmentRefs[]` con `isAttachmentRefForSend(ref, consortiumId, sendId)`.
4. Carga `tenant_emails` activos (`isDeleted = false`), dedupe case-insensitive; **rechaza** si el set del cliente ≠ set del servidor (nadie puede mandar a externos ni a un subconjunto).
5. Transaction: insert `expense_email_sends` con `id = sendId`, subject fijo `Expensa Mensual`, recipients todos `pending`.
6. Responde `{ sendId }` de inmediato; agenda runner con `after()` (Next.js 16 → `waitUntil` en Vercel).

### Runner background

1. Marca send `sending`.
2. Selecciona recipients `pending` \| `failed` (nunca `sent`).
3. `createExpenseEmailSignedUrls` (TTL 6 h); **no** loguea URLs firmadas.
4. `mapWithConcurrency` ≤ 10 → `sendExpenseEmail` one-by-one (`path` + display `filename`); `paymentAlias` / `billingEmail` desde el consorcio en runtime.
5. Persiste por recipient: `sent`/`failed`, `attempts`, `lastAttemptAt`, `resendId` / `error` (ES, sin URLs).
6. Rollup: `sent` \| `partial` \| `failed` + counts; `finishedAt` si no quedan pending.
7. Si el proceso se corta: filas no tocadas siguen `pending`; status puede quedar `sending` → recuperable con retry (stale ≥ 2 min).

### Semántica retryPending

- Error si no hay `pending`/`failed`.
- Si status `sending` y **no** stale (< 2 min desde último `lastAttemptAt` o `createdAt`): `CONFLICT` en español (anti spam / carrera).
- Si stale o estado terminal parcial/failed: re-agenda el mismo runner (mismo body/link/subject/attachments).
- Nunca toca recipients `sent`.

### Runtime

- [`src/app/api/trpc/[trpc]/route.ts`](../../src/app/api/trpc/[trpc]/route.ts): `maxDuration = 120` (techo para `after()` del fan-out). Upload (`60`) y auth **sin cambios**.
- Background: `import { after } from "next/server"` (doc local `node_modules/next/dist/docs/.../after.md`).

### Supuestos

- UX canónica = Todos los activos; el campo `recipients` del input se conserva solo para verificar igualdad exacta.
- `linkUrl` del input (o fallback `driveLink` del consorcio) se persiste en el send; alias de cobro **no** se guarda en la fila (se lee del consorcio al enviar).
- Doble saludo resuelto en Fase 4: `buildMonthlyExpenseMessage` sin prefijo; template saluda `Hola Vecino/a,`.
- Plan Vercel debe permitir ≥ 120s en `/api/trpc` para fan-outs grandes; si el techo del plan es 60s, cortes → `pending` + retry.

### Pendientes de esta fase (no ejecutados por restricción)

- Smoke create → poll `getSend` → estados coherentes
- Smoke retry solo pending/failed
- Unit/integration del router y runner (mock Resend / Storage)
- Migración `0010` aplicada (bloquea persistencia real)

---

## Hecho — Fase 2 (2026-07-21)

### Dependencia

- `@supabase/supabase-js` (server-only vía helpers; también en `serverExternalPackages` de `next.config.ts`)

### Env (server-only)

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en [`src/env.ts`](../../src/env.ts) (opcionales al boot; assert al usar)
- Placeholders en [`.env.example`](../../.env.example)
- Nunca `NEXT_PUBLIC_*` para service role

### Cliente + helpers Storage

Archivos:

- [`src/lib/storage/supabase-admin.ts`](../../src/lib/storage/supabase-admin.ts) — `getSupabaseAdminClient()` / `isSupabaseStorageConfigured()`
- [`src/lib/storage/expense-emails.ts`](../../src/lib/storage/expense-emails.ts) — paths, sanitize, upload, signed URLs

Paths (canónicos):

| Capa                     | Forma                                                                           |
| ------------------------ | ------------------------------------------------------------------------------- |
| Bucket                   | `expense-emails` (privado)                                                      |
| Object key (Storage API) | `{consortiumId}/{sendId}/{safeFilename}` — **sin** repetir el nombre del bucket |
| `storagePath` (API/DB)   | `expense-emails/{consortiumId}/{sendId}/{safeFilename}`                         |

`filename` en la respuesta = nombre visible original (leaf); el object key usa nombre sanitizado + sufijo `-2`, `-3`… ante colisiones en el mismo upload.

Signed URLs: `createExpenseEmailSignedUrl` / `createExpenseEmailSignedUrls` con TTL `EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS` = **6 h**. Bucket sigue privado.

### Route Handler

- [`src/app/api/expense-emails/upload/route.ts`](../../src/app/api/expense-emails/upload/route.ts)
- `POST` multipart; auth = `getSession()`; acceso consorcio = `findAccessibleConsortium` (mismo gate que tRPC)
- Validación: 1–3 PDFs, MIME/magic `%PDF`, ≤ 5 MB c/u; errores en español
- `preferredRegion = "gru1"`, `maxDuration = 60`

### Contrato Zod (actualizado)

- `expenseEmailUploadResponseSchema` — `{ sendId, attachments }`
- `createExpenseEmailSendInputSchema` ahora exige **`sendId`** (el UUID reservado del upload)

---

## Contrato del endpoint (Fase 2) — Fase 3 debe respetar

### `POST /api/expense-emails/upload`

**Request** `multipart/form-data`:

| Campo          | Tipo        | Obligatorio | Notas                                         |
| -------------- | ----------- | ----------- | --------------------------------------------- |
| `consortiumId` | uuid string | sí          | Consorcio accesible por la sesión             |
| `sendId`       | uuid string | no          | Si falta, el server genera uno y lo devuelve  |
| `files`        | File (1–3)  | sí          | Solo PDF; ≤ 5 MB c/u; campo repetible `files` |

**Response 200:**

```json
{
  "sendId": "<uuid>",
  "attachments": [
    {
      "storagePath": "expense-emails/<consortiumId>/<sendId>/<safe>.pdf",
      "filename": "Nombre original.pdf",
      "sizeBytes": 12345
    }
  ]
}
```

`attachments[]` es compatible con `expenseEmailAttachmentRefSchema` (Fase 0).

**Errores (body `{ error: string }` en español):** 401 / 404 / 400 (validación) / 503 (Storage no configurado) / 500 (fallo de upload).

### Decisiones de integración para Fase 3

1. **UUID reservado:** el upload ocurre **antes** de insertar `expense_email_sends`. El `sendId` del upload **es** el PK del envío. Fase 3 debe:
   - exigir `sendId` en la mutation (`createExpenseEmailSendInputSchema` ya lo tiene);
   - `insert` con `id: input.sendId` (no dejar solo `gen_random_uuid()`);
   - validar cada `attachmentRefs[].storagePath` con `isAttachmentRefForSend(ref, consortiumId, sendId)` (helper Fase 2).
2. **Orden UI (cuando se cablee dialog):** (a) opcionalmente generar `sendId` en cliente o dejar que el server lo asigne; (b) `POST` upload; (c) mutation create con ese `sendId` + `attachments`; (d) navegar a `/consorcios/[id]/envios/[envioId]`.
3. **Runner:** al enviar, usar `createExpenseEmailSignedUrls(attachmentRefs)` y pasar `path` + `filename` (display) a `sendExpenseEmail`. No hacer públicos los objetos.
4. **Huérfanos:** si upload OK y create falla, quedan objetos bajo `{consortiumId}/{sendId}/` sin fila. Cleanup = Fase 6 / retención 60 días (documentado).
5. **No** cablear el dialog ni el runner en esta fase (restricción).

---

## Hecho — Fase 1 (2026-07-21)

### Template React Email (nuevo; no toca notificaciones)

Archivos:

- [`src/emails/expensa-mensual.tsx`](../../src/emails/expensa-mensual.tsx) — template canónico
- [`emails/expensa-mensual.tsx`](../../emails/expensa-mensual.tsx) — re-export para `pnpm email`

Comportamiento:

- Saludo fijo **`Hola Vecino/a,`**
- Props: `consorcio`, `mensaje`, `linkUrl?`, `paymentAlias?`, `attachmentNames?`, `remitente?`, `unsubscribeUrl?`
- Bloque “información relevante” (alias + link) alineado a la maqueta
- Lista de nombres de PDFs (binario solo por API attachments)
- Layout/colores forkeados de `NotificacionConsorcio` — **ese archivo no se modificó**

### Render reutilizable (preview = mismo template)

- [`src/lib/email/render-expense-email.tsx`](../../src/lib/email/render-expense-email.tsx) — `renderExpenseEmailHtml(props)`
- Usado por `sendExpenseEmail`; la preview server de Fase 4 debe llamar a esta misma función (no HTML paralelo)

### `sendExpenseEmail` (Resend `emails.send`, no batch)

- [`src/lib/email/send-expense-email.ts`](../../src/lib/email/send-expense-email.ts)
- Subject fijo `Expensa Mensual` (`EXPENSE_EMAIL_SUBJECT`); prefijo `[para: email-real]` si `EMAIL_OVERRIDE_TO`
- `resolveEmailTo` existente
- `reply_to` solo si `billingEmail` tiene valor
- `attachments: [{ path, filename }]`
- Retry acotado en 429 vía `withRateLimitRetry`
- Pipeline body-only (`send.tsx` / `batch.send`) **intacto**

### Concurrency + 429 (para runner Fase 3)

- [`src/lib/email/concurrency.ts`](../../src/lib/email/concurrency.ts)
- `mapWithConcurrency` (default pensado ≤ 10: `EXPENSE_EMAIL_SEND_CONCURRENCY`)
- `withRateLimitRetry` + `isResendRateLimitError`
- Sin dependencia nueva (`p-limit` no añadido; helper pequeño en repo)

---

## Hecho — Fase 0 (2026-07-21)

### Schema Drizzle

Archivos:

- [`src/db/schema.ts`](../../src/db/schema.ts) — tablas nuevas; `email_log` intacto
- Migración generada: [`drizzle/0010_cuddly_silverclaw.sql`](../../drizzle/0010_cuddly_silverclaw.sql) (+ snapshot/journal)

Tablas:

- `expense_email_sends` — `consortium_id`, subject/body/link, status (`queued`…), `attachment_refs` jsonb, counts, `sent_by_user_id`, timestamps
- `expense_email_recipients` — `send_id`, email, status (`pending`|`sent`|`failed`), `resend_id`, error, attempts

Estados como `text` + `$type` (sin `pgEnum`, patrón del repo). Índices: historial por consorcio (`consortium_id, created_at`); recipients por `send_id` y `(send_id, status)`.

### Contratos Zod

- [`src/lib/schemas/expense-email.ts`](../../src/lib/schemas/expense-email.ts) — import `z` solo desde `@/lib/zod`
- Constantes: bucket `expense-emails`, retención 60 días, máx 3×5 MB, subject `Expensa Mensual`, signed URL TTL 6 h
- Schemas: attachment ref, upload response, create input (+ `sendId`), DTOs send/recipient/detail

### Storage

El repo **no** gestiona Storage declarativamente. Setup documentado en:

- [`docs/enviar-expensa-mensual/STORAGE.md`](./STORAGE.md) — bucket privado, policies server-only/signed URLs, retención 60 días, checklist manual
- Env cableado en código (Fase 2); bucket remoto sigue **manual**

**No** se creó el bucket en remoto ni se añadieron credenciales.

---

## Hecho — UI / maqueta (2026-07-21)

Alcance acordado: **solo UI** (opción 1). Backend / endpoints / envío real en otra pasada.

### Dialog — `SendMonthlyExpenseDialog`

Archivos:

- [`src/components/expense-emails/send-monthly-expense-dialog.tsx`](../../src/components/expense-emails/send-monthly-expense-dialog.tsx)
- [`src/components/form/form-pdf-files.tsx`](../../src/components/form/form-pdf-files.tsx)
- Cableado en [`src/components/consortiums/consortium-detail.tsx`](../../src/components/consortiums/consortium-detail.tsx)

Comportamiento maqueta: ver sección “Decisión de producto confirmada” arriba.

### Pantalla de estado — maqueta (reemplazada en Fase 5)

Archivos (ahora con datos reales):

- Ruta: [`src/app/(dashboard)/consorcios/[id]/envios/[envioId]/page.tsx`](<../../src/app/(dashboard)/consorcios/[id]/envios/[envioId]/page.tsx>)
- [`src/components/expense-emails/expense-email-send-status-screen.tsx`](../../src/components/expense-emails/expense-email-send-status-screen.tsx)
- Columnas: [`src/components/expense-emails/expense-email-send-recipient-columns.tsx`](../../src/components/expense-emails/expense-email-send-recipient-columns.tsx)

---

## Decisiones cerradas (post-review)

| ID / tema            | Decisión                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **C1**               | Opción B: create → return `sendId` → pantalla estado + runner background                                            |
| **C2**               | Opción A: `expense_email_sends` + `expense_email_recipients` ligadas al consorcio/envío; no mezclar con `email_log` |
| **C3**               | ≥1 PDF obligatorio                                                                                                  |
| **C4**               | Env var `EMAIL_OVERRIDE_TO`                                                                                         |
| **C5**               | Máx **3** PDFs × **5 MB** c/u                                                                                       |
| **C6**               | Supabase Storage, bucket **privado**, subida por servidor                                                           |
| Menor 1              | Asunto: **`Expensa Mensual`**                                                                                       |
| Menor 2              | Ruta: **`/consorcios/[id]/envios/[envioId]`**                                                                       |
| Menor 3              | Saludo: **`Vecino/a`**                                                                                              |
| Menor 4              | Anti doble-click / no dos envíos                                                                                    |
| Menor 5              | CTA: **`Reintentar pendientes`**                                                                                    |
| Menor 6              | Preview = mismo template del mail                                                                                   |
| Menor 7              | Retención PDFs: **60 días**                                                                                         |
| Menor 8              | Historial de expensa **dentro de cada consorcio**                                                                   |
| **Maqueta UX** ✅    | Destinatarios solo Todos; mensaje automático mes/año; link/alias readonly (no altera schema)                        |
| **Upload/sendId** ✅ | Upload reserva UUID; Fase 3 reutiliza como PK; object key sin duplicar bucket name                                  |

## Bloqueadores abiertos

Ninguno para el **código** verificado (lint/ts/test/build).  
Operativos / QA pendientes (bloquean smoke real y sign-off):

- Bucket privado `expense-emails` en Supabase (manual)
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en `.env` local / Vercel
- Migración `0010` aplicada
- `RESEND_API_KEY` / `EMAIL_FROM` (y opcional `EMAIL_OVERRIDE_TO`) para envío real
- Límite de body de la plataforma (Vercel ~4.5 MB en algunos planes) vs 3×5 MB — verificar en deploy
- Plan Vercel con `maxDuration` ≥ 120s en `/api/trpc` (si el plan topea en 60s, fan-outs grandes quedan recuperables vía retry)
- E2E / QA checklist browser (AC-01…AC-42) — **no** firmada

## Próximo paso

1. Operativo: migrate `0010` + bucket Storage + env Resend/Supabase.
2. Smoke reales + sign-off QA.md cuando se autorice.

---

## Pruebas / migraciones pendientes (no ejecutadas)

Por restricción explícita del usuario, **no** se corrieron tests, linters, typecheck, builds, previews, scripts de envío, QA, curls, uploads reales ni cambios remotos en Supabase. Checklist para el **final / verificación** cuando se autorice:

### Migraciones

- [ ] `pnpm db:migrate` (PGlite local) — aplicar `0010_cuddly_silverclaw`
- [ ] `pnpm db:migrate:prod` (o `DB_DRIVER=postgres DIRECT_DATABASE_URL=… pnpm db:migrate`) — solo cuando se decida tocar Postgres remoto
- [ ] Verificar tablas `expense_email_sends` / `expense_email_recipients` y FKs/índices en DB

### Storage (manual)

- [ ] Crear bucket privado `expense-emails` en Supabase Dashboard (pasos en [STORAGE.md](./STORAGE.md))
- [ ] Confirmar sin acceso público; service role solo en secretos de servidor
- [ ] Setear `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` en `.env` / Vercel
- [ ] Smoke (Fase 2): `POST /api/expense-emails/upload` con 1–2 PDFs <5 MB → 200 + paths
- [ ] Smoke: rechazo 0 PDFs, >3, >5 MB, non-PDF
- [ ] Smoke: signed URL abre el PDF; objeto no es público sin firma
- [ ] Verificar límite de body de la plataforma con ~15 MB multipart
- [ ] Pasada manual de cleanup >60 días (procedimiento en STORAGE.md)

### Fase 3 — tRPC / runner (cuando se autorice)

- [ ] Smoke: upload → `expenseEmails.create` → return `sendId` inmediato; `getSend` pasa `queued`/`sending` → `sent`/`partial`/`failed`
- [ ] Smoke: destinatarios solo activos; rechazo si el cliente manda email externo o subconjunto
- [ ] Smoke: segundo `create` con mismo `sendId` es idempotente (no duplica filas; re-agenda si `queued`)
- [ ] Smoke: `retryPending` no reenvía `sent`; reintenta `pending`+`failed`
- [ ] Smoke: retry mientras `sending` fresco → CONFLICT; tras stale ≥ 2 min permite reclaim
- [ ] Smoke: doble schedule / runners concurrentes — solo un lease vigente; fencing por token + recipients CAS
- [ ] Smoke controlado: llamada a Resend que excede el lease — documentar el duplicado residual esperado sin idempotency key del proveedor
- [x] Unit: `isAttachmentRefForSend` gate en create; idempotencia queued+reschedule (mock) _(2026-07-22)_
- [x] Unit: runner rollup counts/status; stale/lease _(2026-07-22)_
- [x] Unit: errores UI sin signed URLs / secretos _(2026-07-22)_
- [ ] `listRecentByConsortium` ordena por `createdAt` desc, respeta limit, expone `sentByUserName`

### Fase 4 — dialog UI (cuando se autorice)

- [ ] E2E: dialog → upload → create → redirect `/consorcios/[id]/envios/[envioId]`
- [ ] Preview iframe = mismo HTML que `renderExpenseEmailHtml` / mail real (saludo una sola vez)
- [ ] Readonly visibles: mensaje automático, link, alias
- [ ] Doble click / retry: un solo `sendId`; create fallido no re-sube PDFs si no cambiaron
- [ ] CTA disabled sin PDFs / sin destinatarios / durante submit
- [ ] Demo mode: botón oculto
- [ ] Toasts de error en español (upload 4xx/5xx, create TRPC)

### Fase 5 — status + historial UI (cuando se autorice)

- [ ] E2E: status poll mientras `queued`/`sending` fresco; se detiene en terminal o sending stale
- [ ] E2E: resumen counts + tabla recipients con DataTable
- [ ] E2E: **Reintentar pendientes** solo pending/failed; toasts ES; anti-spam / CONFLICT
- [ ] E2E: deep-link + refresh conserva estado
- [ ] Historial en detalle del consorcio (fecha/status/counts/enviado por nombre); link a detalle
- [ ] Historial **no** aparece en Notificaciones admin
- [ ] Demo mode: historial de expensa oculto

### Fase 2 — unit (cuando se autorice)

- [x] `sanitizeExpenseEmailObjectFilename` — path traversal, colisiones, extensión `.pdf` _(2026-07-22 unit)_
- [x] `storagePathToObjectKey` / `buildExpenseEmailStoragePath` — sin duplicar bucket en object key _(2026-07-22 unit)_
- [x] `isAttachmentRefForSend` — acepta path del send; rechaza otro consortium/send / `..` / nested _(2026-07-22 unit)_
- [x] `isPdfFile` — magic `%PDF` vs type incorrecto _(2026-07-22 unit)_
- [ ] Route handler: 401 sin sesión; 404 consorcio ajeno; 400 validaciones; 503 sin env Storage

### Fase 1 — email / template (cuando se autorice)

- [ ] `pnpm email` — preview visual de `ExpensaMensual` (alias, link, lista de PDFs, saludo `Vecino/a`)
- [x] Unit tests: `renderExpenseEmailHtml` / template (props → HTML con saludo, alias, link, adjuntos) _(2026-07-22)_
- [x] Unit tests: builder/payload de `sendExpenseEmail` con Resend mock (`emails.send`, no `batch.send`) _(2026-07-22)_
- [x] Unit tests: subject con/sin `EMAIL_OVERRIDE_TO` (`[para: …]`) _(2026-07-22)_
- [x] Unit tests: `reply_to` presente solo con `billingEmail`; omitido si vacío _(2026-07-22)_
- [x] Unit tests: `mapWithConcurrency` respeta orden y techo de concurrencia _(2026-07-22)_
- [x] Unit tests: `withRateLimitRetry` reintenta 429 y no reintenta otros errores _(2026-07-22)_
- [ ] Smoke manual (opcional): 1 PDF vía `path` a `EMAIL_OVERRIDE_TO` sin tocar notificaciones/comentarios
- [ ] Regresión: `sendEmail` / `batch.send` (notificaciones + comentarios) sin cambios de comportamiento

### Fase 6 — hardening / QA (cuando se autorice)

- [ ] AC-01…AC-42 de [QA.md](./QA.md) (ninguno marcado pasado en la pasada de verificación de código)
- [ ] Camino feliz con override + PDF real
- [ ] Parcial + Reintentar pendientes; corte a mitad recuperable
- [ ] Reply-To con/sin billingEmail
- [ ] Sin service role / signed URLs en Network tab del browser ni logs de cliente
- [x] `pnpm lint` / typecheck (`tsgo`) / `pnpm test` / `pnpm build` _(2026-07-22)_
- [ ] Sign-off MVP en QA.md

---

## Changelog docs

| Fecha      | Cambio                                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-21 | SPEC, PLAN, PROGRESS iniciales post-discovery                                                                                           |
| 2026-07-21 | Añadidos ADVERSARIAL-REVIEW.md + QA.md                                                                                                  |
| 2026-07-21 | Review + QA reescritos en lenguaje claro para humanos                                                                                   |
| 2026-07-21 | Cerrados C3 (≥1 PDF) y C4 (`EMAIL_OVERRIDE_TO`)                                                                                         |
| 2026-07-21 | Cerrados C1, C2, C5, C6 + 8 menores; SPEC/PLAN/QA/PROGRESS/REVIEW sync                                                                  |
| 2026-07-21 | UI maqueta: Dialog + status page; Fase 4 done (shell); Fase 5 parcial                                                                   |
| 2026-07-21 | **Fase 0:** schema + Zod + migración `0010` (no aplicada) + STORAGE.md                                                                  |
| 2026-07-21 | Confirmada decisión maqueta (Todos / mensaje auto / link readonly)                                                                      |
| 2026-07-21 | **Fase 1:** template + render + `sendExpenseEmail` + concurrency/429                                                                    |
| 2026-07-21 | **Fase 2:** Storage client + upload route + signed URL helpers; contrato sendId reservado                                               |
| 2026-07-21 | **Fase 3:** tRPC `expenseEmails` create/get/retry/list + runner `after()` + maxDuration 120                                             |
| 2026-07-21 | **Fase 4:** dialog upload→create→navigate; preview `expenseEmails.preview`; saludo sin duplicar; SPEC/QA sync UX canónica               |
| 2026-07-21 | **Fase 5:** status `getSend`+poll+retry; historial en consorcio; gap `sentByUserId` sin nombre                                          |
| 2026-07-21 | **Fase 6 (estática):** lease token + fencing; `sentByUserName`; STORAGE env/cleanup manual; docs UX sync; verificación pendiente        |
| 2026-07-22 | **Verificación código:** lint/tsgo/test/build OK; +10 archivos de unit tests; fixes tipos/lint; QA browser/servicios reales no firmados |
