# SPEC — Enviar expensa mensual

Feature principal: desde el detalle de un consorcio, enviar a inquilinos/propietarios seleccionados un correo con comentario, link y uno o varios PDFs adjuntos, vía Resend.

Estado del botón actual: `Enviar expensa mensual` en `consortium-detail.tsx` es un no-op. No unificar con Notificaciones ni con `sendComment` (flujos distintos; este es más complejo).

---

## 1. Objetivo

El administrador de un consorcio puede:

1. Abrir un dialog desde **Enviar expensa mensual**.
2. Elegir destinatarios (misma UX de selector que el modal de comentario).
3. Escribir un comentario, opcionalmente editar un link (default = `driveLink` del consorcio), adjuntar PDFs.
4. Ver “Se enviará a X personas” + preview del correo.
5. Enviar; ver pantalla/estado del envío (progreso / resultado).
6. Reintentar manualmente solo los fallidos (UI).
7. Tener registro histórico (quién, cuándo, a quién, outcome) por si preguntan “¿cuándo lo enviaste?”.

---

## 2. Alcance MVP

### Incluye

- Dialog modal (no ruta dedicada de composición).
- Subject fijo: `Expensas Mensual` (sin campo asunto en UI).
- Campos: destinatarios (selector), comentario (requerido), link (libre, default `driveLink`), PDFs (**mínimo 1**, máx **5 MB** por archivo).
- Contador “Se enviará a X personas”.
- Preview del HTML del template antes de enviar.
- Template **nuevo** (fork de `NotificacionConsorcio`); no modificar el de notificaciones/comentarios.
- Mismo set de PDFs para todos los destinatarios.
- `From`: `EMAIL_FROM` (override de dominio futuro).
- `reply_to`: `consortium.billingEmail` cuando exista.
- Respetar `EMAIL_OVERRIDE_TO` / resolve-to actual mientras el dominio no esté verificado.
- Envío con adjuntos vía `emails.send` (uno a uno), concurrency ≤ 10, rate limit Resend 10 req/s.
- Persistencia de job + filas por destinatario; pantalla de estado; retry fallidos.
- Upload de PDFs a **Supabase Storage** (temp o audit — ver §7) para: límites de body de Vercel, retry, y modo `path` hacia Resend.

### Fuera de alcance (MVP)

- Campo asunto editable.
- Personalización por unidad/depto (solo nombre del destinatario).
- PDFs distintos por destinatario.
- Unificar con Notificaciones / `sendComment`.
- Job infra async (Inngest/Trigger/QStash) — mismo modelo de datos, runner sync en MVP.
- Webhooks Resend (delivered/bounced) — solo outcome de aceptación API.
- Cambiar pie legal / unsubscribe del template base.
- From = email Gmail/Outlook del consorcio (imposible sin DNS del cliente).
- Dominio verificado en Resend (construir el código listo; seguir con override).

---

## 3. UX

### 3.1 Dialog de composición

Trigger: botón primario en detalle de consorcio.

| Campo         | Comportamiento                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Destinatarios | Selector multi, misma funcionalidad que modal “Enviar comentario” (lista de `tenant_emails` del consorcio).                                           |
| Comentario    | Textarea requerida.                                                                                                                                   |
| Link          | Input URL; default `consortium.driveLink`; editable; vacío permitido si producto lo acepta — **decisión:** permitir vacío; si hay valor, validar URL. |
| PDFs          | File input múltiple; **≥1 obligatorio**; solo `application/pdf`; máx 5 MB c/u; rechazar con error en español.                                         |
| Contador      | “Se enviará a X personas” (X = destinatarios seleccionados).                                                                                          |
| Preview       | Panel/tab con HTML del template nuevo (comentario + link + nombres de adjuntos).                                                                      |
| Confirmación  | CTA “Enviar”; disabled sin destinatarios, sin comentario, **sin al menos 1 PDF**, o mientras sube/envía.                                              |

### 3.2 Pantalla / vista de estado

Tras enviar (o al abrir un envío histórico):

- Resumen: estado del job (`sending` \| `sent` \| `partial` \| `failed`), enviados / fallidos / total.
- Tabla por destinatario: email, nombre, status, error si aplica.
- Polling mientras `sending`.
- Acción: **Reenviar fallidos (N)** (solo UI + mutation; mismos adjuntos/comentario/link/subject).

Ruta sugerida (ES): `/consorcios/[id]/envios/[envioId]` o sheet a pantalla completa — preferir ruta para deep-link y refresh.

### 3.3 Historial

Registro consultable ligado al consorcio (lista reciente en detalle o en la ruta de envíos). Mínimo: fecha, status, counts, enviado por. Detalle = misma vista de estado.

---

## 4. Email

### 4.1 Template

- Archivo nuevo: p.ej. `src/emails/expensa-mensual.tsx` (+ preview en `emails/`).
- Partir de `NotificacionConsorcio` (layout/colores), agregar:
  - Bloque de mensaje (comentario).
  - CTA / link visible si hay URL.
  - Lista de nombres de PDFs adjuntos (el binario va por API attachments, no embebido).
- Props sugeridas: `nombre`, `consorcio`, `mensaje`, `linkUrl?`, `attachmentNames?`, `remitente?`, `unsubscribeUrl?` (mantener pie actual).

### 4.2 Subject / From / Reply-To

```ts
subject: "Expensas Mensual";
from: env.EMAIL_FROM;
// prod futuro: `${consortium.name} <expensas@mail.dominio-verificado.com>`
reply_to: consortium.billingEmail ?? undefined;
to: [resolveEmailTo(recipient.email)];
```

### 4.3 Adjuntos (Resend)

- Batch API **no** soporta `attachments` → siempre `resend.emails.send`.
- Límite total email ≤ **40 MB after Base64**.
- Preferencia MVP: PDFs en Supabase Storage + `attachments: [{ path: signedOrPublicUrl, filename }]`.
- Alternativa `content` (Buffer) solo si un solo PDF chico y no hay retry diferido — no es el camino principal.
- Mismo set de archivos para todos.

---

## 5. Datos

### 5.1 Existente a reutilizar

- `tenant_emails` — destinatarios del consorcio.
- `consortiums.billingEmail`, `consortiums.driveLink`.
- `email_log` — hoy es un blob de recipients + `resendIds[]`; **insuficiente** para retry por fila.
- Pipeline Resend actual (`getResendClient`, `resolveEmailTo`, OTP/notificaciones) — extender, no romper `batch.send` body-only.

### 5.2 Nuevo / extensión

**Opción A (recomendada):** extender dominio de envíos:

```
expense_email_sends (o email_sends)
  id, consortium_id, subject, body, link_url?
  status: queued | sending | sent | partial | failed
  attachment_refs jsonb  -- [{ storagePath, filename, sizeBytes }]
  sent_by_user_id, created_at, finished_at?
  sent_count, failed_count, recipient_count

expense_email_recipients
  id, send_id, email, name?
  status: pending | sent | failed
  resend_id?, error?, attempts, last_attempt_at
```

**Opción B:** evolucionar `email_log` + tabla hija `email_log_recipients` y discriminar tipo (`notification` \| `expense`). Elegir en implementación; SPEC exige **1 fila por destinatario** con status.

No guardar binarios de PDF en Postgres; solo refs a Storage + metadata.

---

## 6. Envío (runner)

Pipeline único (sync en MVP; async después sin cambiar modelo/UI):

1. Validar input + auth (acceso al consorcio).
2. Subir PDFs a Storage (si aún no están).
3. Insertar send + N recipients (`pending`).
4. Responder al cliente con `sendId` → navegar a estado.
5. En el mismo request (MVP) o worker (luego): loop con concurrency ≤ 10:
   - `emails.send` + attachments `path` + `reply_to`.
   - Update recipient `sent` \| `failed`.
   - Backoff en 429.
6. Rollup status del send.
7. `maxDuration` en la route ≥ 60–120s.

Body-only (`batch.send`) permanece para notificaciones/comentarios.

---

## 7. Storage

| Decisión      | Valor                                                                                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Provider MVP  | **Supabase Storage** (stack actual)                                                                                                                                                        |
| R2            | Contender si egress Free se quema (`path` × destinatarios × MB); no MVP salvo dolor real                                                                                                   |
| ¿Persistir?   | **Sí, al menos por la vida del job + retry**                                                                                                                                               |
| Temp vs audit | **Audit corto:** conservar PDFs asociados al envío (p.ej. 90 días o indefinido mientras el send exista). Pricing ~$0 a este volumen. Permite reabrir historial y reintentar sin re-upload. |
| Límite upload | 5 MB / PDF; validar client + server                                                                                                                                                        |
| Body Vercel   | No mandar multi-PDF por tRPC JSON; upload directo a Storage (signed upload) o route multipart, luego mutation solo con paths                                                               |

---

## 8. Auth / permisos

Mismo gate que acciones de consorcio / `sendComment` (`protectedProcedure` + consortium accesible). Solo quien puede administrar el consorcio envía.

---

## 9. Criterios de éxito (producto)

- Desde el botón, un admin completa el dialog y los destinatarios reciben mail con comentario, link (si hay) y PDFs.
- Reply del tenant llega a `billingEmail` del consorcio (header `Reply-To`).
- Fallos parciales visibles; retry solo fallidos sin reenviar los `sent`.
- Historial responde “cuándo / a quién / resultado”.
- Notificaciones y comentarios siguen usando su template y `batch.send` sin regresiones.

---

## 10. Decisiones cerradas (investigación)

1. **From por consorcio:** no spoofear Gmail; `From` plataforma + `reply_to` billing.
2. **Batch + attachments:** imposible en Resend; one-by-one.
3. **Sync + async:** un pipeline; runner sync MVP; async = mismo código en worker.
4. **URL vs content:** `path` evita re-subir N×MB desde nuestra función; Resend igual hace N GETs (egress). Aceptable en Supabase Free/Pro a volumen bajo.
5. **Override:** mantener hasta dominio verificado. Env var real: **`EMAIL_OVERRIDE_TO`** (no `EMAIL_TO_OVERRIDE`).
6. **PDFs:** mínimo **1** obligatorio por envío (client + server).
