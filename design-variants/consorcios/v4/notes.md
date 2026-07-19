# Variantes: Selección de consorcios — Ronda 4 (Vercel declutter + spacing)

Base: [`../v3/variant-7-vercel-v2.html`](../v3/variant-7-vercel-v2.html) (declutter). En las tres: grid Squareline (`.grid-noise` 24px), sin badges/avisos/reclamos/timestamps, métricas Unidades + Inquilinos, “Enviar comentario” como botón real.

## Variante 1 — Evolutiva (`variant-1-evolutiva.html`)

- Tesis: mismo sistema Vercel monócromo; solo corrige ritmo y affordance del CTA de card.
- Qué cambia respecto a V2: `p-5`, grid `gap-5`, más aire hero→lista y dt→dd; botón full-width bordered `h-8` (no text-link).
- Hallazgos del audit que corrige: whitespace insuficiente; CTA de card sin chrome; botones no anclados visualmente.

## Variante 2 — Exploratoria (`variant-2-exploratoria.html`)

- Tesis: escala editorial un poco más generosa + canvas frío oklch-255, manteniendo Squareline.
- Eje de exploración: botón outline full-width `h-9` + tipografía/H1 más presentes + cards `p-5` / grid `gap-4`.
- Riesgos / trade-offs: se acerca a tokens de la app (hue 255) y se aleja un poco del ink puro Vercel.

## Variante 3 — Experimental (`variant-3-experimental.html`)

- Tesis: “ink ledger” — Source Serif 4 + IBM Plex Sans, papel cálido, bordes más pesados, CTAs azules filled.
- Reglas de AGENTS.md que rompe a propósito: neutros hue 255 (canvas cálido); cards planas sin sombra vs bordes/peso tipográfico; acento azul solo sparingly → azul como acción primaria.
- Riesgos: serif + papel puede sentirse menos “dashboard SaaS”; hay que validar si convive con el resto de Konsorcio.

## Variante 2 Final — lista para integrar (`variant-2-final.html`)

- Base: exploratoria V4 + ajustes de captura pre-integración.
- Removido: breadcrumbs (header + hero), heading “Tus consorcios”.
- Tokens: primary/secondary/background/card/sidebar alineados a `src/app/globals.css`.
- CTA “Agregar nuevo consorcio”: botón `primary` (h-9).
- Paginación: Anterior / Siguiente / página inactiva = `secondary`; página actual = `primary`.
- Avatar: icono Building2 grande (`size-12`) con tiles de color distintos (blue/amber/violet/teal/rose/green).
- Squareline `.grid-noise` conservado. Siguiente paso: portar a React en pantalla de consorcios.

## Candidatos para AGENTS.md

- [x] CTA secundaria de card siempre con chrome de botón (borde o fill), nunca solo texto azul.
- [x] Mantener patrón Squareline (grid 24px + fade) como textura opcional de pantallas de colección.
- [x] Métricas de card: stack label `text-xs muted` + valor `tabular-nums` con gap vertical ≥ `mt-1.5`.
- [x] Grid de colección: gap mínimo `gap-4`/`gap-5` entre cards; padding interno ≥ `p-5` cuando la card tiene CTA inferior.
- [x] Botones de acción en cards alineados con `mt-auto` para línea horizontal limpia en el grid.

Adoptados en `AGENTS.md` Design direction (referencia: `variant-2-final.html`).
