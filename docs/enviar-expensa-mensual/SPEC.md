# SPEC — Enviar expensa mensual

Feature principal: desde el detalle de un consorcio, enviar a inquilinos/propietarios seleccionados un correo con comentario, link y uno o varios PDFs adjuntos, vía Resend.

Estado del botón actual: `Enviar expensa mensual` en `consortium-detail.tsx` es un no-op. No unificar con Notificaciones ni con `sendComment` (flujos distintos; este es más complejo).

---

## 1. Objetivo

El administrador de un consorcio puede:

1. Abrir un dialog desde **Enviar expensa mensual**.
2. Enviar a **todos** los `tenant_emails` activos del consorcio (sin selector parcial en MVP maqueta).
3. Usar un mensaje **automático** (mes/año), ver link y alias de cobro en solo lectura, adjuntar PDFs.
4. Ver “Se enviará a X personas” + preview del correo (mismo template que el mail real).
5. Enviar; la UI navega de inmediato a la pantalla de estado; el envío corre en background.
6. **Reintentar pendientes** (fallidos o cortados a mitad) sin reenviar los ya `sent`.
7. Tener historial de expensas **dentro del consorcio** (quién, cuándo, a quién, outcome).

---

## 2. Alcance MVP

### Incluye

- Dialog modal (no ruta dedicada de composición).
- Subject fijo: **`Expensa Mensual`** (sin campo asunto en UI).
- Campos: destinatarios = **Todos** los activos (sin selector parcial), mensaje automático mes/año (sin textarea), link `driveLink` y alias de cobro **readonly**, PDFs (**mínimo 1**, **máximo 3**, máx **5 MB** por archivo).
- Contador “Se enviará a X personas”.
- Preview del HTML del **mismo template** que se usa al enviar (server).
- Template **nuevo** (fork de `NotificacionConsorcio`); no modificar el de notificaciones/comentarios.
- Saludo fijo en el mail: **`Vecino/a`** (no nombre personal ni unidad). El builder del mensaje **no** repite ese saludo.
- Mismo set de PDFs para todos los destinatarios.
- `From`: `EMAIL_FROM` (override de dominio futuro).
- `reply_to`: `consortium.billingEmail` cuando exista.
- Respetar `EMAIL_OVERRIDE_TO` / resolve-to actual mientras el dominio no esté verificado.
- Envío con adjuntos vía `emails.send` (uno a uno), concurrency ≤ 10, rate limit Resend 10 req/s.
- Persistencia: tablas nuevas `expense_email_sends` + `expense_email_recipients` ligadas al consorcio; pantalla de estado; **Reintentar pendientes**.
- Flujo C1: mutation crea send + recipients → devuelve `sendId` → UI navega a estado → runner en background (no bloquear el dialog hasta terminar).
- Anti doble-click: CTA deshabilitado durante submit/upload + validación cautelosa para no crear dos envíos.
- Upload de PDFs a **Supabase Storage** (bucket **privado**, retención **60 días**) para: límites de body de Vercel, retry, y modo `path` hacia Resend.

### Fuera de alcance (MVP)

- Campo asunto editable.
- Personalización por unidad/depto o nombre del destinatario.
- PDFs distintos por destinatario.
- Unificar con Notificaciones / `sendComment`.
- Job infra async (Inngest/Trigger/QStash) — mismo modelo de datos; runner en background en MVP (p.ej. `waitUntil` / fire-and-continue).
- Webhooks Resend (delivered/bounced) — solo outcome de aceptación API.
- Cambiar pie legal / unsubscribe del template base.
- From = email Gmail/Outlook del consorcio (imposible sin DNS del cliente).
- Dominio verificado en Resend (construir el código listo; seguir con override).
- Historial en Notificaciones admin (vive solo en el consorcio).

---

## 3. UX

### 3.1 Dialog de composición

Trigger: botón primario en detalle de consorcio.

**UX canónica (maqueta confirmada 2026-07-21):** no hay selector parcial de destinatarios, ni textarea de mensaje, ni link editable.

| Campo          | Comportamiento                                                                                                                                 |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Destinatarios  | Siempre **todos** los `tenant_emails` activos del consorcio. Texto informativo + contador; sin multi-select.                                   |
| Mensaje        | Automático con mes/año (`buildMonthlyExpenseMessage`); sin textarea. El template aporta el saludo `Hola Vecino/a,` (el builder no lo duplica). |
| Link           | Solo lectura: valor `consortium.driveLink` (vacío permitido).                                                                                  |
| Alias de cobro | Solo lectura: valor `consortium.paymentAlias` (visible en preview del template).                                                               |
| PDFs           | File input múltiple; **≥1 y ≤3**; solo `application/pdf`; máx **5 MB** c/u; rechazar con error en español.                                     |
| Contador       | “Se enviará a X personas” (X = todos los activos).                                                                                             |
| Preview        | Panel con HTML del **mismo template** del mail real vía procedure server (`expenseEmails.preview`).                                            |
| Confirmación   | CTA “Enviar”; disabled sin destinatarios activos, **sin al menos 1 PDF**, o mientras sube/envía. **No** permitir doble pulsación (ver §10).    |

### 3.2 Pantalla / vista de estado

Tras enviar (o al abrir un envío histórico):

- Ruta (ES): **`/consorcios/[id]/envios/[envioId]`** (deep-link y refresh).
- Resumen: estado del job (`sending` \| `sent` \| `partial` \| `failed`), enviados / fallidos / pendientes / total.
- Tabla por destinatario: email, status, error si aplica (sin columna “nombre”; el saludo del mail es fijo).
- Polling mientras `sending`.
- Acción única: **Reintentar pendientes** (reintenta `pending` y `failed`; no reenvía los `sent`; mismos adjuntos/comentario/link/subject).

### 3.3 Historial

Registro consultable **dentro de cada consorcio** (lista reciente en detalle o bajo la misma sección de envíos). No aparece en Notificaciones admin. Mínimo: fecha, status, counts, enviado por (nombre del usuario si existe en `user.name`). Detalle = misma vista de estado.

**UX canónica del dialog (maqueta 2026-07-21):** destinatarios = Todos los activos; mensaje automático mes/año (sin textarea); `driveLink` y alias de cobro **readonly** (visibles en el dialog y en la preview).

---

## 4. Email

### 4.1 Template

- Archivo nuevo: p.ej. `src/emails/expensa-mensual.tsx` (+ preview en `emails/`).
- Partir de `NotificacionConsorcio` (layout/colores), agregar:
  - Saludo: **`Vecino/a`**.
  - Bloque de mensaje (comentario).
  - CTA / link visible si hay URL.
  - Lista de nombres de PDFs adjuntos (el binario va por API attachments, no embebido).
- Props sugeridas: `consorcio`, `mensaje`, `linkUrl?`, `attachmentNames?`, `remitente?`, `unsubscribeUrl?` (mantener pie actual). No hace falta `nombre` personalizado.
- El preview del dialog renderiza **este mismo template** (server), no un HTML paralelo.

### 4.2 Subject / From / Reply-To

```ts
subject: "Expensa Mensual";
from: env.EMAIL_FROM;
// prod futuro: `${consortium.name} <expensas@mail.dominio-verificado.com>`
reply_to: consortium.billingEmail ?? undefined;
to: [resolveEmailTo(recipient.email)];
```

Con `EMAIL_OVERRIDE_TO`: prefijo en asunto `[para: email-real@…]` para QA.

### 4.3 Adjuntos (Resend)

- Batch API **no** soporta `attachments` → siempre `resend.emails.send`.
- Límite total email ≤ **40 MB after Base64** (con máx 3 × 5 MB queda holgado).
- Preferencia MVP: PDFs en Supabase Storage + `attachments: [{ path: signedOrPublicUrl, filename }]`.
- Alternativa `content` (Buffer) solo si un solo PDF chico y no hay retry diferido — no es el camino principal.
- Mismo set de archivos para todos.

---

## 5. Datos

### 5.1 Existente a reutilizar

- `tenant_emails` — destinatarios del consorcio.
- `consortiums.billingEmail`, `consortiums.driveLink`.
- Pipeline Resend actual (`getResendClient`, `resolveEmailTo`, OTP/notificaciones) — extender, no romper `batch.send` body-only.
- `email_log` — **no** reutilizar para este feature (sigue solo para notificaciones / comentarios).

### 5.2 Nuevo (opción A — cerrada)

Tablas nuevas, **vinculadas a cada consorcio / envío**:

```
expense_email_sends
  id, consortium_id, subject, body, link_url?
  status: queued | sending | sent | partial | failed
  attachment_refs jsonb  -- [{ storagePath, filename, sizeBytes }]
  sent_by_user_id, created_at, finished_at?
  sent_count, failed_count, recipient_count

expense_email_recipients
  id, send_id, email
  status: pending | sent | failed
  resend_id?, error?, attempts, last_attempt_at
```

- `consortium_id` obligatorio en el send; recipients siempre vía `send_id`.
- No guardar binarios de PDF en Postgres; solo refs a Storage + metadata.
- No columna `name` en recipients (saludo fijo `Vecino/a`).

---

## 6. Envío (runner)

Pipeline (background en MVP; async worker después sin cambiar modelo/UI):

1. Validar input + auth (acceso al consorcio) + anti-duplicado corto de submit.
2. Subir PDFs a Storage (si aún no están) — bucket privado.
3. Insertar send + N recipients (`pending`).
4. **Responder al cliente con `sendId` de inmediato** → UI navega a `/consorcios/[id]/envios/[envioId]`.
5. En background (mismo proceso con `waitUntil` / fire-and-continue, o equivalente): loop con concurrency ≤ 10:
   - `emails.send` + attachments `path` + `reply_to`.
   - Update recipient `sent` \| `failed`.
   - Backoff en 429.
6. Rollup status del send.
7. `maxDuration` en la route ≥ 60–120s; si el proceso muere, quedan `pending` recuperables con **Reintentar pendientes**.

Body-only (`batch.send`) permanece para notificaciones/comentarios.

---

## 7. Storage

| Decisión      | Valor                                                                              |
| ------------- | ---------------------------------------------------------------------------------- |
| Provider MVP  | **Supabase Storage**                                                               |
| Bucket        | **Privado**                                                                        |
| R2            | Contender si egress Free se quema; no MVP salvo dolor real                         |
| Path layout   | `expense-emails/{consortiumId}/{sendId}/…`                                         |
| Upload        | Preferir **ruta del servidor** (multipart); no exponer secret key al browser       |
| Links         | Firmados con TTL suficiente para completar todo el fan-out (no 60s)                |
| Retención     | **60 días**; luego cleanup (job o lifecycle)                                       |
| Límite upload | **1–3** PDFs; **5 MB** / PDF; validar client + server                              |
| Body Vercel   | No mandar multi-PDF por tRPC JSON; upload a Storage, luego mutation solo con paths |

---

## 8. Auth / permisos

Mismo gate que acciones de consorcio / `sendComment` (`protectedProcedure` + consortium accesible). Solo quien puede administrar el consorcio envía.

---

## 9. Criterios de éxito (producto)

- Desde el botón, un admin completa el dialog y los destinatarios reciben mail con saludo `Vecino/a`, comentario, link (si hay) y PDFs.
- Tras Enviar, la UI llega a la pantalla de estado sin esperar el fan-out completo; el progreso se actualiza solo.
- Reply del tenant llega a `billingEmail` del consorcio (header `Reply-To`).
- Fallos parciales / cortes visibles; **Reintentar pendientes** no reenvía los `sent`.
- Historial dentro del consorcio responde “cuándo / a quién / resultado”.
- Notificaciones y comentarios siguen usando su template y `batch.send` sin regresiones.
- Doble click en Enviar no crea dos envíos.

---

## 10. Decisiones cerradas

1. **From por consorcio:** no spoofear Gmail; `From` plataforma + `reply_to` billing.
2. **Batch + attachments:** imposible en Resend; one-by-one.
3. **Sync + async:** un pipeline; MVP = create → return id → background runner + poll UI (C1 opción B).
4. **URL vs content:** `path` evita re-subir N×MB desde nuestra función; Resend igual hace N GETs (egress). Aceptable en Supabase Free/Pro a volumen bajo.
5. **Override:** mantener hasta dominio verificado. Env var real: **`EMAIL_OVERRIDE_TO`** (no `EMAIL_TO_OVERRIDE`).
6. **PDFs:** mínimo **1**, máximo **3**; **5 MB** c/u (C3 + C5).
7. **Tablas:** opción A — `expense_email_sends` + `expense_email_recipients` ligadas al consorcio (C2).
8. **Storage:** Supabase, bucket privado, subida por servidor, retención **60 días** (C6).
9. **Asunto:** `Expensa Mensual`.
10. **Ruta estado:** `/consorcios/[id]/envios/[envioId]`.
11. **Saludo:** `Vecino/a`.
12. **Anti doble-click:** deshabilitar CTA + validación cautelosa de doble pulsación.
13. **Retry CTA:** `Reintentar pendientes` (pending + failed).
14. **Preview:** mismo template que el mail real.
15. **Historial:** solo dentro de cada consorcio.
16. **UX maqueta (2026-07-21):** destinatarios = Todos los activos; mensaje automático mes/año; `driveLink` y alias readonly; sin textarea ni selector parcial.
