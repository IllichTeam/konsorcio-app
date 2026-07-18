# Variantes: Selección de consorcios

## Variante 1 — Evolutiva

- Tesis: mismos tokens Linear/Geist; densificar cards left-aligned, toolbar útil y demotar el comentario.
- Qué cambia respecto al actual: badge de iniciales en lugar del Building2 gigante; meta (unidades / última expensa); search + contador; comentario como icon button; sin empty slots ni sombra.
- Hallazgos del audit que corrige: jerarquía débil, desperdicio de espacio, CTA secundaria compitiendo, falta de búsqueda, alineación centrada.

## Variante 2 — Exploratoria

- Tesis: densidad — lista/tabla seleccionable estilo Linear/Notion en lugar de cards grandes.
- Eje de exploración: estructura de layout (filas densas + columnas de datos vs grid de tarjetas).
- Riesgos / trade-offs: más escalable al crecer, menos “objeto edificio” visual; puede sentirse frío si hay pocos ítems.

## Variante 3 — Experimental

- Tesis: inventario inmobiliario con foto del edificio como señal primaria.
- Reglas de AGENTS.md que rompe a propósito y por qué: cards flat/icon-only → superficies con imagen; tipografía alternativa (Instrument Sans + Geist) y chrome más oscuro para que cada consorcio se lea como propiedad real, no como glifo.

## Variante 4 — Maestro–detalle

- Tesis: patrón de navegación picker — lista filtrable a la izquierda, preview + acciones a la derecha.
- Eje: select-then-open vs one-card-one-click.
- Riesgos / trade-offs: mejor para muchos consorcios y acciones contextuales; pierde la inmediatez del click-a-entrar de la card actual. Desktop-first por diseño.

## Candidatos para AGENTS.md

- [ ] Toolbar de lista (search + count + primary CTA) en pantallas de selección/colección
- [ ] Cards de entidad left-aligned con meta secundaria; icono decorativo nunca > ~2rem
- [ ] Acciones secundarias (comentario) como icon button; el click de la fila/card abre el recurso
- [ ] Cuando N > ~8, preferir densidad de lista o master–detail antes que grid de cards altas
