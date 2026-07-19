# Variantes: Selección de consorcios — Ronda 3 (light mode, sin expensas)

Objetivo: efecto WOW en la pantalla inicial, siempre light mode, y **cero rastro de expensas/montos/período** (reemplazados por métricas operativas: avisos sin leer, reclamos abiertos, emails de inquilinos, última actividad, estado). Cada variante fue generada por un subagente independiente (Grok 4.5 high) que iteró contra `RUBRICA.md` hasta cumplirla; el agente principal auditó con grep + screenshots y mandó correcciones de coherencia de contenido.

## Variante 1 — Supabase light (`variant-1-supabase.html`)

- Tesis: consola Supabase en claro — canvas frío con leve tinte verdoso, acento verde disciplinado, badges mono cuadraditas, cards tipo "proyecto" con métricas operativas.
- Qué cambia respecto al actual: dark → light; el dinero desaparece y cada card responde "¿qué pasa en este edificio?" (unidades, avisos, reclamos, emails, última actividad, estado); toolbar con buscador + KPIs en línea; badge "en línea" en el header.
- Riesgos / trade-offs: el tinte verde del canvas se aparta del gris frío hue 255 del sistema; el verde como acento único reemplaza al azul de marca.

## Variante 2 — Apple light (`variant-2-apple.html`)

- Tesis: calma, materia y tipografía — canvas perla, sidebar/topbar translúcidos con blur, saludo display gigante liviano ("Bienvenida, María González"), sección "Requieren atención" con 2 cards elevadas + grouped list Apple con hairlines inset para el resto.
- Eje de exploración: jerarquía editorial (el saludo es el hero) + triage implícito (destacadas vs. lista), en vez de grid uniforme.
- Riesgos / trade-offs: el saludo enorme consume viewport; radios 14–22px y translucidez rompen los tokens actuales (`--radius` 0.625rem, cards opacas).

## Variante 3 — Linear light (`variant-3-linear.html`)

- Tesis: precisión de herramienta — hairlines, grilla de 4px, Geist + Geist Mono con `tabular-nums`, acento índigo Linear, keyboard-first (⌘K en buscador, tecla `C` en la CTA), chips de filtro con contadores, spotlight CSS en el borde de la card al hover.
- Eje de exploración: densidad informativa + triage por chips ("Con avisos 4", "Con reclamos 3", "Operativos 5") y estados semánticos con dot + label.
- Riesgos / trade-offs: el índigo reemplaza al azul del sistema; la entrada escalonada usa `animation ... both` (contenido invisible unos ms al cargar).

## Variante 4 — PostHog light (`variant-4-posthog.html`)

- Tesis: personalidad sin perder seriedad — crema cálida, bordes 1px oscuros con radio bajo, Bricolage Grotesque display + Figtree body, naranja PostHog + amarillo de soporte, tags cuadrados, patrón de puntos sutil, hover con sombra dura offset.
- Reglas de AGENTS.md que rompe a propósito y por qué: neutros cálidos en vez del gris frío hue 255 (ADN PostHog); dos acentos (naranja + amarillo) en vez de uno; sombras duras offset en vez de cards planas — todo al servicio del carácter.
- Riesgos / trade-offs: es la que más se aleja de la identidad actual; el micro-copy con voz ("elegí un edificio y seguí") exige sostener ese tono en toda la app.

## Variante 5 — Cursor light (`variant-5-cursor.html`)

- Tesis: editor como producto — canvas off-white frío, Geist + mono para paths/atajos, CTA ink, ⌘K, chips de triage, cards como "archivos" con path `consorcios/barrio`, rail/spotlight en hover.
- Eje: keyboard-first + densidad IDE sin caer en el índigo Linear.
- Riesgos: los paths estilo filesystem pueden sentirse demasiado "dev" para administradores de edificios.

## Variante 6 — Ramp light (`variant-6-ramp.html`)

- Tesis: claridad financiera sin dinero — Satoshi + Plex Mono, verde Ramp, gesto tipográfico **9 / 312**, triage operativo (avisos/reclamos/correos) con badges coherentes.
- Eje: hero numérico + tipografía display fuerte; cero montos.
- Riesgos: el tinte sage/verde se aparta del azul de marca; el hero 9/312 compite con el H1.

## Variante 7 — Vercel light (`variant-7-vercel.html`)

- Tesis: precisión monócroma — `#fafafa`, Geist, CTA negra, hairlines, status dots (Al día / Atención / Operativo), azul solo en focus/links.
- Eje: contraste ink + cards tipo project/deployment traducidas a light.
- Riesgos: el look monócromo puede sentirse frío frente al azul de Konsorcio; WOW más sutil que PostHog/Apple.

## Variante 7 V2 — Vercel declutter (`variant-7-vercel-v2.html`)

- Tesis: misma dirección Vercel, menos ruido operativo — cards solo con identidad + Unidades + Inquilinos + CTA.
- Qué se saca respecto a V1: párrafo "Administrás…", "Página 1 de 2 · 6 visibles", badges de estado, Avisos, Reclamos, timestamps relativos.
- Se conserva: KPIs globales 9/312, grid, paginación inferior, look monócromo.
- Antes/después: abrir `variant-7-vercel.html` junto a `variant-7-vercel-v2.html`.

## Candidatos para AGENTS.md

- [ ] Prohibir montos/período en la pantalla de selección: las cards de colección comunican estado operativo (avisos, reclamos, actividad), no finanzas.
- [ ] Regla de coherencia de badges de estado: el estado se deriva de los datos visibles de la card (p. ej. reclamos > 0 o avisos > umbral → "Atención"); nunca un badge que contradice sus propios números.
- [ ] Prohibir chips/badges constantes (mismo valor en todas las filas): si no varía, no informa y se elimina.
- [ ] Entrada escalonada CSS (40ms por elemento, `cubic-bezier` suave, `prefers-reduced-motion` → sin animación y opacidad 1) como patrón oficial de carga de colecciones.
- [ ] Buscador con hint de atajo (⌘K) y atajos visibles en CTAs (patrón Linear/Cursor) para pantallas de colección.
- [ ] Patrón "triage": sección "Requieren atención" destacada antes de la lista completa (patrón Apple, variante 2).
- [ ] Métrica de card estándar: label `text-xs muted` + valor `tabular-nums`, footers alineados con `mt-auto` entre cards.
- [ ] CTA primaria monócroma (ink/negro) como alternativa al azul en pantallas de colección (patrón Vercel).
