# Variantes: Empty state — Selección de consorcios

Estado actual: toolbar con buscador + CTA chico a la derecha, y un `<p>` muted en card (“Todavía no hay consorcios…”). El mensaje pide crear, pero el botón vive aparte; el search no tiene nada que buscar.

## Audit (estado actual)

| Hallazgo                   | Severidad | Por qué                                                   |
| -------------------------- | --------- | --------------------------------------------------------- |
| Search visible con 0 items | Alta      | Control muerto; sugiere que “falta buscar”, no crear      |
| CTA y copy desacoplados    | Alta      | Split attention: leés el empty, mirás arriba a la derecha |
| Empty = párrafo pasivo     | Alta      | No es un estado “getting started”; no invita              |
| KPIs en 0/0 sin guía       | Media     | Refuerzan vacío sin siguiente paso                        |
| CTA `h-9` en toolbar       | Media     | Peso visual de acción secundaria en un momento primario   |

Buenas prácticas (ux-guidelines + WIG): mensaje útil **y** acción en el mismo bloque; no blank/passive; focus-visible; reduced-motion.

## Variante 1 — Evolutiva

- Tesis: mismo DS (Geist, tokens, Squareline, hero + KPIs); **sacar search**; empty card centrado con tile + título + copy + CTA `h-11` primario adentro.
- Qué cambia: un solo lugar para la acción; copy más concreto (unidades / emails / expensas).
- Hallazgos que corrige: search muerto, CTA desacoplado, empty pasivo.
- Tradeoff: layout de colección intacto; KPIs en 0 siguen ahí (honestos, un poco fríos).

## Variante 2 — Exploratoria

- Tesis: el empty **es la primera card** del grid (slot dashed + Plus); siluetas tenues muestran dónde vivirán las demás.
- Eje: estructura de layout (grid-shaped empty), no tipografía.
- Riesgos / trade-offs: más “producto” Linear/Notion; siluetas pueden leerse como loading si no se cuidan opacity/aria-hidden. CTA menos “botón filled” (borde dashed) — affordance distinta.
- Por qué explorar: enseña el destino visual de la pantalla, no solo un mensaje.

## Variante 3 — Experimental

- Tesis: first-run como momento de onboarding: H1 = CTA verbal, panel con botón full-width grande + 3 pasos; sin KPIs ni Squareline.
- Rompe a propósito: tipografía (Plus Jakarta ExtraBold), glow radial, densidad editorial, numeración 01/02/03, hero de colección reemplazado.
- Riesgos: se siente “landing” vs dashboard; hay que volver a la UI poblada sin choque. Numeración solo justifica si el orden importa (acá sí: crear → cargar → enviar).

## Comparación rápida

| Opción          | Señal CTA                      | Cuándo                                  | Por qué                                         |
| --------------- | ------------------------------ | --------------------------------------- | ----------------------------------------------- |
| V1 Evolutiva    | Botón primary centrado en card | Querés ship rápido sin romper colección | Mínimo diff vs DS; corrige el problema real     |
| V2 Exploratoria | Ghost card en grilla           | Querés continuity visual con la lista   | Enseña el grid futuro; CTA más sutil            |
| V3 Experimental | Botón full-bleed + pasos       | First-run es raro y merece ritual       | Máxima iniciativa; más riesgo de tono marketing |

## Candidatos para AGENTS.md

- [ ] Empty de colección: ocultar search/filtros cuando `length === 0` y no hay query activa.
- [ ] Empty de colección: CTA primario **dentro** del empty (no solo en toolbar).
- [ ] Empty composed: icon/tile + título + una frase de siguiente paso + botón (nunca solo texto muted).
- [ ] (Opcional) Patron ghost-slot cuando el empty predice un grid de cards.
