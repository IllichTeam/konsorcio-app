# Issues de Linear — Enviar expensa mensual

Documento de preparación. **Estos issues todavía no fueron creados ni modificados en Linear.**

Al registrarlos:

- Proyecto: **proyecto toro**
- Equipo: **Irada**
- Estado final: **Done**
- Antes de crear cada issue, buscar uno existente con el mismo alcance y reutilizarlo si corresponde.
- Crear solo el título corto, sin descripción ni criterios de aceptación.

## Títulos propuestos

- [ ] `Crear esquema y storage de expensas`
- [ ] `Preparar emails de expensas con adjuntos`
- [ ] `Implementar subida y envío de expensas`
- [ ] `Conectar diálogo de envío de expensas`
- [ ] `Implementar estado e historial de expensas`
- [ ] `Reforzar reintentos de expensas`

## Correspondencia con el plan

| Título                                       | Alcance ya implementado                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `Crear esquema y storage de expensas`        | Fase 0: tablas, contratos Zod, migración y documentación del bucket privado    |
| `Preparar emails de expensas con adjuntos`   | Fase 1: template, render compartido, Resend individual, concurrencia y backoff |
| `Implementar subida y envío de expensas`     | Fases 2–3: upload multipart, signed URLs, tRPC, runner background y retry      |
| `Conectar diálogo de envío de expensas`      | Fase 4: upload → create → navegación y preview del template real               |
| `Implementar estado e historial de expensas` | Fase 5: polling, DataTable, reintento e historial por consorcio                |
| `Reforzar reintentos de expensas`            | Fase 6: lease de runners, claims, validaciones y documentación operativa       |

## Pendiente antes del cierre técnico

Los issues pueden registrarse como Done por implementación, pero la verificación sigue pendiente por decisión del usuario:

- migración `0010` sin aplicar;
- bucket privado y variables de Supabase sin configurar;
- tests, lint, typecheck y build sin ejecutar;
- smokes de Storage, Resend, polling y reintentos sin ejecutar;
- QA AC-01–AC-42 sin firmar.

La checklist completa está en [PROGRESS.md](./PROGRESS.md).
