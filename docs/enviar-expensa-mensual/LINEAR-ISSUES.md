# Issues de Linear — Enviar expensa mensual

Log de Done en Linear (proyecto **proyecto toro**, equipo **Irada**). Solo título corto; sin descripción ni criterios.

## Registrados (Done)

### Fases del feature

| Issue                                                                                      | Título                                     | Alcance                                        |
| ------------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| [IRA-42](https://linear.app/irada/issue/IRA-42/crear-esquema-y-storage-de-expensas)        | Crear esquema y storage de expensas        | Fase 0: tablas, Zod, migración, doc bucket     |
| [IRA-43](https://linear.app/irada/issue/IRA-43/preparar-emails-de-expensas-con-adjuntos)   | Preparar emails de expensas con adjuntos   | Fase 1: template, render, Resend, concurrencia |
| [IRA-44](https://linear.app/irada/issue/IRA-44/implementar-subida-y-envio-de-expensas)     | Implementar subida y envío de expensas     | Fases 2–3: upload, signed URLs, tRPC, runner   |
| [IRA-45](https://linear.app/irada/issue/IRA-45/conectar-dialogo-de-envio-de-expensas)      | Conectar diálogo de envío de expensas      | Fase 4: dialog → create → preview              |
| [IRA-47](https://linear.app/irada/issue/IRA-47/implementar-estado-e-historial-de-expensas) | Implementar estado e historial de expensas | Fase 5: polling, DataTable, historial          |
| [IRA-46](https://linear.app/irada/issue/IRA-46/reforzar-reintentos-de-expensas)            | Reforzar reintentos de expensas            | Fase 6: lease, claims, hardening               |

### Ops / follow-ups

| Issue                                                                                   | Título                                  | Por qué separado                            |
| --------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| [IRA-40](https://linear.app/irada/issue/IRA-40/configurar-storage-de-expensas)          | Configurar storage de expensas          | Bucket + secret key + smoke Storage (ops)   |
| [IRA-41](https://linear.app/irada/issue/IRA-41/numerar-envios-de-expensa-por-consorcio) | Numerar envíos de expensa por consorcio | `send_number` + UI Nº / Acciones (post-MVP) |

## Cómo registrar más

1. Buscar issue existente con el mismo alcance; reutilizar si cabe.
2. Crear solo título corto en español (estilo: `CRUD emails de inquilinos`).
3. Proyecto **proyecto toro**, estado **Done**.
4. Anotar acá con link.

## Pendiente de verificación (no bloquea el log Done)

Implementación registrada; QA/smoke puede seguir pendiente:

- migrate remoto / env Vercel según [PROGRESS.md](./PROGRESS.md) / [SERVICES-REPORT.md](./SERVICES-REPORT.md)
- smoke Resend con `EMAIL_OVERRIDE_TO`
- sign-off AC en [QA.md](./QA.md)
