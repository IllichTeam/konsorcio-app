# Enviar expensa mensual — índice

Documentación del feature de envío de expensas mensuales (correo masivo con comentario, link y PDFs vía Resend).

**Estado:** decisiones C1–C6 y menores cerradas. **UI maqueta** del dialog + pantalla de estado lista (2026-07-21). Backend (Fase 0+) pendiente — ver [PROGRESS.md](./PROGRESS.md).

| Doc                                              | Rol                                                         |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [SPEC.md](./SPEC.md)                             | Qué construir, alcance, UX, datos, decisiones               |
| [PLAN.md](./PLAN.md)                             | Fases de implementación y PRs                               |
| [PROGRESS.md](./PROGRESS.md)                     | Estado actual y próximos pasos                              |
| [ADVERSARIAL-REVIEW.md](./ADVERSARIAL-REVIEW.md) | Review crítica (decisiones cerradas — contexto para Fase 0) |
| [QA.md](./QA.md)                                 | Criterios de aceptación y plan de QA (sign-off MVP)         |

### Resumen rápido de decisiones

- Background + pantalla de estado (`/consorcios/[id]/envios/[envioId]`)
- Tablas nuevas por consorcio/envío; bucket Supabase privado; PDFs 1–3 × ≤5 MB; retención 60 días
- Asunto `Expensa Mensual`; saludo `Vecino/a`; CTA `Reintentar pendientes`; historial en el consorcio
