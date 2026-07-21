# PROGRESS — Enviar expensa mensual

Última actualización: 2026-07-21

## Estado global

| Fase | Nombre                            | Status      |
| ---- | --------------------------------- | ----------- |
| 0    | Foundation (schema + storage)     | not started |
| 1    | Email path + template attachments | not started |
| 2    | Upload PDFs                       | not started |
| 3    | tRPC send + runner sync           | not started |
| 4    | Dialog UI                         | not started |
| 5    | Status + historial UI             | not started |
| 6    | Hardening                         | not started |

**Discovery:** done (2026-07-21). SPEC + PLAN escritos.

## Hecho en discovery (no código de feature)

- Inventario: Resend + `batch.send` + `NotificacionConsorcio` + `tenant_emails` + `email_log` + botón no-op + `sendComment`.
- Research: From/Reply-To, batch vs attachments, storage pricing (Supabase vs Blob vs R2).
- Decisiones cerradas en SPEC §10.

## Decisiones cerradas (post-review)

- **C3:** ≥1 PDF obligatorio.
- **C4:** env var documentada como `EMAIL_OVERRIDE_TO` (nombre real del código).

## Bloqueadores abiertos

- **C1** runner (background + poll) — crítico.
- **C2** tablas Opción A — crítico.
- **C5** max N PDFs + techo Σ tamaño — crítico.
- **C6** diseño upload Storage — crítico.
- Ruta ES status (`/envios/` vs `/expensas/`) — menor.
- Asunto copy final — menor.

## Próximo paso

Cerrar C1, C2, C5 (y C6) en SPEC/PLAN; luego **Fase 0**.

## Changelog docs

| Fecha      | Cambio                                                |
| ---------- | ----------------------------------------------------- |
| 2026-07-21 | SPEC, PLAN, PROGRESS iniciales post-discovery         |
| 2026-07-21 | Añadidos ADVERSARIAL-REVIEW.md + QA.md                |
| 2026-07-21 | Review + QA reescritos en lenguaje claro para humanos |
| 2026-07-21 | Cerrados C3 (≥1 PDF) y C4 (`EMAIL_OVERRIDE_TO`)       |
