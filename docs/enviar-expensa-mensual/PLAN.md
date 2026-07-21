# PLAN — Enviar expensa mensual

Construcción por partes. Cada fase debe dejar el repo usable (sin romper notificaciones/comentarios). Orden pensado para desbloquear riesgos tempranos (Storage upload, Resend attachments, modelo per-recipient).

Dependencias de skills al implementar: `vercel-react-best-practices`, `drizzle`, `supabase-postgres-best-practices`. Forms: `react-hook-form` + zod + wrappers en `src/components/form/`. Data: tRPC + TanStack Query. UI ES / código EN.

---

## Fase 0 — Foundation (schema + types)

**Goal:** modelo de datos listo sin UI.

- Decidir Opción A (`expense_email_sends` + `expense_email_recipients`) vs evolucionar `email_log` (§5 SPEC). Preferir A si queremos no ensuciar el log de notificaciones admin.
- Migración Drizzle + tipos Zod en `src/lib/schemas/`.
- Bucket Supabase Storage (privado) + policies mínimas (upload/read solo server / signed URLs).
- Extender `email_log` solo si se elige B; si A, dejar notificaciones como están.

**Done when:** `pnpm drizzle-kit` migrate OK; schemas exportados; bucket existe en doc de env.

---

## Fase 1 — Email path con attachments

**Goal:** poder mandar 1 mail de prueba con PDF vía código server, sin dialog final.

- Template nuevo `expensa-mensual.tsx` (+ preview `pnpm email`).
- Función `sendExpenseEmail` (o generalizar `send` con branch attachments):
  - `emails.send` (no batch).
  - `reply_to` desde billingEmail.
  - `attachments: [{ path, filename }]`.
  - `resolveEmailTo` / override.
- Concurrency helper `p-limit` ≤ 10 + retry 429.
- Tests unitarios del builder de payload (mock Resend).

**Done when:** test o script manda 1 PDF a override address; template preview OK.

---

## Fase 2 — Upload PDFs

**Goal:** admin puede poner archivos en Storage sin pasar multi-MB por tRPC JSON.

- Signed upload (client → Supabase) o route `POST` multipart server-side.
- Validación: ≥1 PDF al enviar; PDF MIME; ≤ 5 MB c/u; cantidad máxima pendiente de C5 (propuesta review: ≤5 + Σ ~25 MB).
- Devolver `{ storagePath, filename, sizeBytes }[]` al form.

**Done when:** upload de 2 PDFs de <5MB funciona en local; rechazo de 0 PDFs al submit, >5MB y non-PDF.

---

## Fase 3 — tRPC send + runner sync

**Goal:** mutation crea job, fan-out, persiste per-recipient.

- `consortiums.sendMonthlyExpense` (o router `expenseEmails.send`):
  - input: consortiumId, recipients, message, link?, attachmentRefs.
  - subject fijo.
  - insert send + recipients → return `sendId`.
  - runner sync en la mutation **o** fire-and-continue con `waitUntil` si hace falta no bloquear — preferir: mutation arranca envío y cliente polléa (si timeout, filas quedan `pending`/`failed` recuperables).
- `getSend` + `retryFailed`.
- `maxDuration` en route handlers relevantes.

**Done when:** llamar mutation con 2–3 recipients mock → filas `sent`/`failed` coherentes; retry solo falla.

---

## Fase 4 — Dialog UI

**Goal:** botón abre dialog usable.

- Componente dominio `send-monthly-expense-dialog.tsx` (o similar).
- Reusar patrón selector del modal de comentario.
- Form wrappers; contador X personas; link default driveLink.
- Preview (render server action o HTML precomputado / iframe `srcDoc`).
- Wire botón en `consortium-detail.tsx`.
- Toasts ES; loading states.

**Done when:** flujo manual E2E en browser con override: dialog → enviar → redirect estado.

---

## Fase 5 — Status + historial UI

**Goal:** producto “¿cuándo lo enviaste?” + retry.

- Página `/consorcios/[id]/envios/[envioId]` (nombre ES).
- Polling TanStack Query mientras `sending`.
- Tabla destinatarios (`DataTable`).
- CTA Reenviar fallidos.
- Lista corta de envíos recientes en detalle del consorcio (opcional pero útil).

**Done when:** envío parcial muestra fallidos; retry los marca sent; refresh conserva estado.

---

## Fase 6 — Hardening

- Límites de tamaño total vs 40MB Base64 Resend (validar Σ sizes antes de enviar).
- Empty billingEmail → omit `reply_to` (no fallar).
- Demo mode: ocultar/disable igual que otras acciones.
- Tests router + smoke template.
- Documentar en este folder: env vars, bucket name, cómo probar con override.

**Done when:** checklist QA (archivo generado por review) en verde local.

---

## Fuera de este plan (post-MVP)

- Worker async (Inngest/etc.) reutilizando el mismo runner.
- Webhooks Resend delivered/bounced.
- Migrar a R2 si egress duele.
- Dominio verificado + From display name = nombre consorcio.
- Asunto editable / plantillas por mes.

---

## Orden de PRs sugerido

1. Schema + storage bucket
2. Template + send-with-attachments lib
3. Upload + tRPC send/retry
4. Dialog UI
5. Status/historial UI + polish
