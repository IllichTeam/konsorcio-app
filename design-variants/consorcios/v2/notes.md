# Variantes: Selección de consorcios — Ronda 2

Objetivo de la ronda: elevar la calidad del diseño con referencia Linear / Supabase / Apple, UX/UI moderna 2026. Cada variante fue generada por un agente independiente con una tesis propia.

## Variante 1 — Linear refinada (`variant-1-linear.html`)

- Tesis: ejecución Linear 2026 dentro del sistema actual — toolbar de colección + cards de entidad densas con metadata operativa; la calidad vive en el detalle (espaciado 4px, alineaciones, atenuación tipográfica).
- Qué cambia respecto al actual: la card pasa de tile decorativa (Building2 gigante) a registro de datos: avatar de iniciales en mono, `<dl>` de métricas con `tabular-nums` (unidades, última expensa + período), footer de estado (dot + "3 avisos sin leer" / "Al día"). Toolbar con buscador ⌘K, filtros con contador, chips de triage, CTA con hint `C`. Acciones secundarias progresivas (`opacity-0 → group-hover`). Breadcrumb Dashboard › Consorcios.
- Hallazgos del audit que corrige: jerarquía débil, card sin información útil, azul de marca usado para codificar estado, sin búsqueda ni triage.

## Variante 2 — Consola Supabase (`variant-2-supabase.html`)

- Tesis: el picker se convierte en consola operativa — cada consorcio es un project-card con métricas vivas que responde "¿qué necesita mi atención?" sin entrar al edificio.
- Eje de exploración: contenido. Stats row del portfolio (consorcios/unidades, expensas emitidas, cobranza promedio, con-deudas, notificaciones) + cards con badge de estado (al día / con deudas / sin emitir), % cobrado con mini-barra, reclamos. Orden por atención requerida, no alfabético. Tokens semánticos `ok/warn/danger` (+ `-soft`) discretos.
- Riesgos / trade-offs: exige datos que la API quizás no expone hoy (% cobrado, reclamos, "sin emitir"); en mobile las cards apiladas alargan el scroll.

## Variante 3 — Dark premium (`variant-3-dark.html`)

- Tesis: dark mode calidad Linear/Vercel — canvas casi-negro frío (hue 255), jerarquía por luminancia (4 niveles de superficie), acento azul más luminoso, montos en Geist Mono tabular.
- Reglas de AGENTS.md que rompe a propósito y por qué: fondo claro → oscuro (es el encargo: evaluar un dark de primera clase); cards sin sombra → sombra de profundidad + glow sutil en hover/focus (en dark la sombra no separa, la luz sí); acento contenido → azul con algo más de presencia porque en oscuro un acento apagado se pierde.
- Detalles: micro-labels uppercase tracking 0.14em solo para metadata, bordes hairline `white/8% → 14%` on-hover, strip de KPIs bajo el header.

## Variante 4 — Apple: calma y materia (`variant-4-apple.html`)

- Tesis: material translúcido + jerarquía tipográfica generosa + grouped list con hairlines inset; sensación premium, calma, táctil.
- Eje de exploración: superficie y tipografía. Hero "Buenas tardes, Martín" en display liviano ~52px; topbar/sidebar translúcidos con `backdrop-blur`; 2 cards destacadas (radio 22px, glyph en tile, chips de estado) para los consorcios más activos + grouped list estilo Apple (contenedor `rounded-2xl`, separadores inset alineados al contenido, chevron) para el resto. Movimiento con física Apple (`cubic-bezier(0.32,0.72,0,1)`), `motion-reduce` respetado.
- Reglas de AGENTS.md que rompe a propósito y por qué: radios 14–22px en vez de `--radius-lg` 0.625rem y sombra difusa solo en hover (tesis táctil/premium); agrega translucidez + blur que el sistema no contempla (necesario para el "material"). Mantiene acento único azul, sin gradientes, español.

## Candidatos para AGENTS.md

- [ ] Cards de entidad = header + bloque `<dl>` de métricas con `tabular-nums` + footer de estado; prohibido el icono gigante centrado como contenido principal de una colección.
- [ ] Montos siempre en fuente mono tabular (`Geist Mono`, `tabular-nums`), alineados a la derecha en columnas.
- [ ] Tokens semánticos de estado `ok/warn/danger` (+ variantes `-soft`) en `globals.css`; el azul primario nunca codifica estado (patrón "status line": dot + label).
- [ ] Estándar de "métrica en card": label `text-xs text-muted-foreground` + valor `text-sm font-medium tabular-nums`, agrupadas en `<dl>` con divisores hairline.
- [ ] Patrón "grouped list" (contenedor redondeado único + filas con separador inset + chevron) como alternativa oficial al grid de cards para colecciones densas.
- [ ] Capa "material": superficie translúcida (card a `/70`–`/85` + `backdrop-blur`) reservada a barras fijas (topbar/sidebar/overlays).
- [ ] Micro-labels uppercase con tracking amplio reservados solo para metadata/secciones, nunca títulos.
- [ ] Toolbar de colección (búsqueda + contador + filtros + CTA primaria) en toda pantalla de selección/listado.
