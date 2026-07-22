# PLAN — Enviar expensa mensual

Construcción por partes. Cada fase debe dejar el repo usable (sin romper notificaciones/comentarios). Orden pensado para desbloquear riesgos tempranos (Storage upload, Resend attachments, modelo per-recipient).

Dependencias de skills al implementar: `vercel-react-best-practices`, `drizzle`, `supabase-postgres-best-practices`. Forms: `react-hook-form` + zod + wrappers en `src/components/form/`. Data: tRPC + TanStack Query. UI ES / código EN.

Decisiones cerradas (ver SPEC §10 / ADVERSARIAL-REVIEW): C1 background + poll, C2 tablas nuevas ligadas al consorcio, C5 máx 3×5 MB, C6 Supabase privado 60 días, asunto `Expensa Mensual`, ruta `/envios/`, saludo `Vecino/a`, CTA `Reintentar pendientes`.

---

## Fase 0 — Foundation (schema + types)

**Goal:** modelo de datos listo sin UI.

- Tablas **opción A** (cerrada): `expense_email_sends` + `expense_email_recipients`, con `consortium_id` / `send_id`. No tocar `email_log`.
- Migración Drizzle + tipos Zod en `src/lib/schemas/`.
- Bucket Supabase Storage **privado** + policies mínimas (upload/read solo server / signed URLs). Path: `expense-emails/{consortiumId}/{sendId}/…`. Retención documentada: **60 días**.
- Dejar notificaciones/comentarios como están.

**Done when:** `pnpm drizzle-kit` migrate OK; schemas exportados; bucket existe en doc de env.

---

## Fase 1 — Email path con attachments

**Goal:** poder mandar 1 mail de prueba con PDF vía código server, sin dialog final.

- Template nuevo `expensa-mensual.tsx` (+ preview `pnpm email`): saludo **`Vecino/a`**, comentario, link, nombres de adjuntos.
- Función `sendExpenseEmail` (o generalizar `send` con branch attachments):
  - `emails.send` (no batch).
  - subject fijo **`Expensa Mensual`** (+ `[para: …]` si override).
  - `reply_to` desde billingEmail.
  - `attachments: [{ path, filename }]`.
  - `resolveEmailTo` / override.
- Concurrency helper `p-limit` ≤ 10 + retry 429.
- Tests unitarios del builder de payload (mock Resend).

**Done when:** test o script manda 1 PDF a override address; template preview OK.

---

## Fase 2 — Upload PDFs

**Goal:** admin puede poner archivos en Storage sin pasar multi-MB por tRPC JSON.

- Route `POST` multipart **server-side** (preferido; bucket privado).
- Validación: **≥1 y ≤3** PDFs; PDF MIME; ≤ **5 MB** c/u.
- Devolver `{ storagePath, filename, sizeBytes }[]` al form.

**Done when:** upload de 2 PDFs de <5MB funciona en local; rechazo de 0 PDFs, >3 PDFs, >5MB y non-PDF.

---

## Fase 3 — tRPC send + runner background

**Goal:** mutation crea job, responde `sendId`, fan-out en background, persiste per-recipient.

- `consortiums.sendMonthlyExpense` (o router `expenseEmails.send`):
  - input: consortiumId, recipients, message, link?, attachmentRefs.
  - subject fijo `Expensa Mensual`.
  - insert send + recipients → **return `sendId` de inmediato**.
  - runner en background (`waitUntil` / fire-and-continue); cliente polléa estado.
  - Si timeout/corte: filas quedan `pending`/`failed` recuperables.
- `getSend` + `retryPending` (CTA **Reintentar pendientes**: `pending` + `failed`; no reenviar `sent`).
- Anti-duplicado cauteloso en submit (no dos envíos por doble click).
- `maxDuration` en route handlers relevantes.

**Done when:** llamar mutation con 2–3 recipients mock → UI puede pollar; filas `sent`/`failed` coherentes; retry solo pendientes/fallidos.

---

## Fase 4 — Dialog UI

**Goal:** botón abre dialog usable.

- Componente dominio `send-monthly-expense-dialog.tsx` (o similar).
- Reusar patrón selector del modal de comentario.
- Form wrappers; contador X personas; link default driveLink; máx 3 PDFs.
- Preview: HTML del **mismo template** (server) — no HTML paralelo.
- CTA Enviar: disabled mientras sube/envía; proteger doble pulsación.
- Wire botón en `consortium-detail.tsx`.
- Toasts ES; loading states.
- Tras éxito: navegar a `/consorcios/[id]/envios/[envioId]`.

**Done when:** flujo manual E2E en browser con override: dialog → enviar → redirect estado (sin esperar fan-out en el dialog).

---

## Fase 5 — Status + historial UI

**Goal:** producto “¿cuándo lo enviaste?” + retry.

- Página **`/consorcios/[id]/envios/[envioId]`**.
- Polling TanStack Query mientras `sending`.
- Tabla destinatarios (`DataTable`) — email, status, error (sin columna nombre).
- CTA **Reintentar pendientes**.
- Historial de envíos recientes **dentro del detalle del consorcio** (no en Notificaciones admin).

**Done when:** envío parcial muestra fallidos; retry los marca sent; refresh conserva estado; historial visible en el consorcio.

---

## Fase 6 — Hardening

- Validar techos 1–3 PDFs / 5 MB (cliente + server) antes de crear el envío.
- Empty billingEmail → omit `reply_to` (no fallar).
- Demo mode: ocultar/disable igual que otras acciones.
- Cleanup / doc de retención PDFs **60 días**.
- Tests router + smoke template.
- Documentar en este folder: env vars, bucket name, cómo probar con override.

**Done when:** checklist QA en verde local.

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
