# PROGRESS — Enviar expensa mensual

Última actualización: 2026-07-21

## Estado global

| Fase | Nombre                            | Status                                     |
| ---- | --------------------------------- | ------------------------------------------ |
| 0    | Foundation (schema + storage)     | not started                                |
| 1    | Email path + template attachments | not started                                |
| 2    | Upload PDFs                       | not started                                |
| 3    | tRPC send + runner background     | not started                                |
| 4    | Dialog UI                         | **UI maqueta done** (sin backend)          |
| 5    | Status + historial UI             | **parcial** — status maqueta; historial no |
| 6    | Hardening                         | not started                                |

**Discovery:** done (2026-07-21). SPEC + PLAN escritos.  
**Review decisions:** done (2026-07-21). C1–C6 + menores cerrados → docs actualizados.  
**UI / maqueta:** done (2026-07-21). Dialog + pantalla de estado cableados; Enviar navega con `sendId` placeholder. Sin schema, Storage, Resend ni runner.

---

## Hecho — UI / maqueta (2026-07-21)

Alcance acordado: **solo UI** (opción 1). Backend / endpoints / envío real en otra pasada.

### Dialog — `SendMonthlyExpenseDialog`

Archivos:

- [`src/components/expense-emails/send-monthly-expense-dialog.tsx`](../../src/components/expense-emails/send-monthly-expense-dialog.tsx)
- [`src/components/form/form-pdf-files.tsx`](../../src/components/form/form-pdf-files.tsx)
- Cableado en [`src/components/consortiums/consortium-detail.tsx`](../../src/components/consortiums/consortium-detail.tsx)

Comportamiento maqueta:

- Botón **Enviar expensa mensual** abre el dialog (respeta demo mode).
- Destinatarios: solo **Todos** (cuenta real vía `useTenantEmails`).
- Alias de cobro + Link del drive: fila label + valor (solo lectura; link azul).
- PDFs: 1–3, ≤5 MB, solo PDF — wrapper `FormPdfFiles` con botón “Seleccionar PDFs”.
- Mensaje **fijo** (no hay textarea): `buildMonthlyExpenseMessage(consortiumName)` con mes capitalizado + año actuales.
- Preview estructural del correo + nota fuera del cuerpo (“previsualización / plantilla”).
- Contador: “Se enviará a todos… / (N personas)” encima del preview.
- CTA Enviar: disabled sin destinatarios o sin ≥1 PDF; al enviar → toast + navega a `/consorcios/[id]/envios/[uuid]` (sin API).

### Pantalla de estado — maqueta

Archivos:

- Ruta: [`src/app/(dashboard)/consorcios/[id]/envios/[envioId]/page.tsx`](<../../src/app/(dashboard)/consorcios/[id]/envios/[envioId]/page.tsx>)
- [`src/components/expense-emails/expense-email-send-status-screen.tsx`](../../src/components/expense-emails/expense-email-send-status-screen.tsx)
- Columnas: [`src/components/expense-emails/expense-email-send-recipient-columns.tsx`](../../src/components/expense-emails/expense-email-send-recipient-columns.tsx)

Comportamiento maqueta:

- Título **Estado del envío**; resumen con métricas + badge de estado dentro de la card.
- `DataTable` de destinatarios: Fecha y hora · Email · Estado · Error (datos mock).
- CTA **Reintentar pendientes** → toast placeholder (sin backend).
- Sin polling real; sin historial en el detalle del consorcio todavía.

### Aún no (backend / resto Fase 5–6)

- Schema `expense_email_sends` / `expense_email_recipients`
- Bucket Supabase + upload multipart
- Template React Email real + `emails.send` con adjuntos
- Mutation create → `sendId` + runner background + retry real
- Preview = render del mismo template (hoy es HTML maqueta)
- Historial de envíos en el detalle del consorcio
- Hardening / QA E2E con override

---

## Decisiones de producto tomadas en la maqueta (ajustar SPEC si se confirman)

Estas salieron en iteración UI y **difieren** del SPEC original (dialog tipo comentario editable). Conviene cerrarlas al actualizar SPEC o al empezar backend:

| Tema           | SPEC original                          | Maqueta actual                                               |
| -------------- | -------------------------------------- | ------------------------------------------------------------ |
| Destinatarios  | uno / varios / todos (como comentario) | Solo **Todos**                                               |
| Comentario     | textarea requerido                     | Mensaje **fijo** con mes/año automáticos + tono amable       |
| Link           | editable (default drive)               | Solo lectura (valor del consorcio)                           |
| Alias de cobro | no en dialog UI                        | Visible en dialog + en preview del mail                      |
| Preview        | mismo template React Email             | Maqueta estructural (contenido alineado; no el template aún) |

---

## Hecho en discovery (no código de feature)

- Inventario: Resend + `batch.send` + `NotificacionConsorcio` + `tenant_emails` + `email_log` + botón no-op + `sendComment`.
- Research: From/Reply-To, batch vs attachments, storage pricing (Supabase vs Blob vs R2).
- Decisiones cerradas en SPEC §10.

## Decisiones cerradas (post-review)

| ID / tema | Decisión                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| **C1**    | Opción B: create → return `sendId` → pantalla estado + runner background                                            |
| **C2**    | Opción A: `expense_email_sends` + `expense_email_recipients` ligadas al consorcio/envío; no mezclar con `email_log` |
| **C3**    | ≥1 PDF obligatorio                                                                                                  |
| **C4**    | Env var `EMAIL_OVERRIDE_TO`                                                                                         |
| **C5**    | Máx **3** PDFs × **5 MB** c/u                                                                                       |
| **C6**    | Supabase Storage, bucket **privado**, subida por servidor                                                           |
| Menor 1   | Asunto: **`Expensa Mensual`**                                                                                       |
| Menor 2   | Ruta: **`/consorcios/[id]/envios/[envioId]`**                                                                       |
| Menor 3   | Saludo: **`Vecino/a`**                                                                                              |
| Menor 4   | Anti doble-click / no dos envíos                                                                                    |
| Menor 5   | CTA: **`Reintentar pendientes`**                                                                                    |
| Menor 6   | Preview = mismo template del mail                                                                                   |
| Menor 7   | Retención PDFs: **60 días**                                                                                         |
| Menor 8   | Historial de expensa **dentro de cada consorcio**                                                                   |

## Bloqueadores abiertos

Ninguno técnico para empezar Fase 0.  
Pendiente de producto: confirmar si las decisiones de la maqueta (tabla arriba) reemplazan el SPEC §3.1 / QA AC-03–AC-08.

## Próximo paso

1. **Confirmar** decisiones de maqueta vs SPEC (destinatarios solo Todos, mensaje fijo, link/alias readonly).
2. **Fase 0** — schema Drizzle + bucket Supabase privado.
3. Luego Fases 1–3 y cablear la UI maqueta al backend real (preview template, upload, mutation, polling, retry, historial).

## Changelog docs

| Fecha      | Cambio                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| 2026-07-21 | SPEC, PLAN, PROGRESS iniciales post-discovery                          |
| 2026-07-21 | Añadidos ADVERSARIAL-REVIEW.md + QA.md                                 |
| 2026-07-21 | Review + QA reescritos en lenguaje claro para humanos                  |
| 2026-07-21 | Cerrados C3 (≥1 PDF) y C4 (`EMAIL_OVERRIDE_TO`)                        |
| 2026-07-21 | Cerrados C1, C2, C5, C6 + 8 menores; SPEC/PLAN/QA/PROGRESS/REVIEW sync |
| 2026-07-21 | UI maqueta: Dialog + status page; Fase 4 done (shell); Fase 5 parcial  |
