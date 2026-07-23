# Enviar expensa mensual — índice

Documentación del feature de envío de expensas mensuales (correo masivo con comentario, link y PDFs vía Resend).

**Estado:** decisiones C1–C6 y menores cerradas. **Fases 0–5** hechas en código. **Fase 6** hardening + **verificación de código** done. Storage local: `SUPABASE_SECRET_KEY` + bucket `expense-emails` + smoke OK (2026-07-22). Pendiente: migrate prod, `EMAIL_OVERRIDE_TO`, QA browser. Ver [PROGRESS.md](./PROGRESS.md).

| Doc                                              | Rol                                                          |
| ------------------------------------------------ | ------------------------------------------------------------ |
| [SPEC.md](./SPEC.md)                             | Qué construir, alcance, UX, datos, decisiones                |
| [PLAN.md](./PLAN.md)                             | Fases de implementación y PRs                                |
| [PROGRESS.md](./PROGRESS.md)                     | Estado actual y próximos pasos                               |
| [ADVERSARIAL-REVIEW.md](./ADVERSARIAL-REVIEW.md) | Review crítica (decisiones cerradas — contexto para Fase 0)  |
| [QA.md](./QA.md)                                 | Criterios de aceptación y plan de QA (sign-off MVP)          |
| [LINEAR-ISSUES.md](./LINEAR-ISSUES.md)           | Títulos preparados para registrar como Done más adelante     |
| [SESSION-HANDOFF.md](./SESSION-HANDOFF.md)       | Estado al pausar y orden recomendado para reanudar           |
| [STORAGE.md](./STORAGE.md)                       | Bucket privado, env vars, retención 60 días (cleanup manual) |

### Resumen rápido de decisiones

- Background + pantalla de estado (`/consorcios/[id]/envios/[envioId]`)
- Tablas nuevas por consorcio/envío; bucket Supabase privado; PDFs 1–3 × ≤5 MB; retención 60 días (cleanup **manual** hasta existir jobs)
- Asunto `Expensa Mensual`; saludo `Vecino/a`; CTA `Reintentar pendientes`; historial en el consorcio
- **UX canónica:** destinatarios = Todos los activos; mensaje automático mes/año; link y alias de cobro readonly
