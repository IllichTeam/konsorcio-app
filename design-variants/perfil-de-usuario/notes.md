# Variantes: Perfil de usuario

Base: captura actual + `src/components/profile/profile-form.tsx`. Lecciones de [`../consorcios/v4/notes.md`](../consorcios/v4/notes.md): CTA secundaria con chrome real, Squareline opcional, canvas frío hue 255, cards `p-5` / gaps generosos, sin text-links azules.

Datos mock: Admin · illich570@gmail.com · +54911-12345678 · CABA. Contraseña en estado cerrado.

## Variante 1 — Evolutiva

- Archivo: [`variant-1-evolutiva.html`](variant-1-evolutiva.html)
- Tesis: mismos tokens / Geist / cards planas; solo corrige jerarquía, spacing y affordances.
- Qué cambia respecto al actual: “Cambiar contraseña” outline (no `primary/70`); email readonly con helper; H1 más claro; ritmo de card consistente; focus-visible.
- Hallazgos del audit que corrige: CTA secundaria lavada; jerarquía título débil; email sin affordance de disabled; spacing irregular.

## Variante 2 — Exploratoria editorial

- Archivo: [`variant-2-exploratoria-editorial.html`](variant-2-exploratoria-editorial.html)
- Tesis: escala editorial (H1 presente, hero identidad + Squareline, form con aire) sobre los mismos tokens.
- Eje de exploración: tipografía / spacing — no nuevo sistema de color.
- Riesgos / trade-offs: puede sentirse “collection” en una pantalla de settings densa; hay que validar si el hero aporta o sobra.

## Variante 3 — Exploratoria split

- Archivo: [`variant-3-exploratoria-split.html`](variant-3-exploratoria-split.html)
- Tesis: layout 2 columnas — rail sticky de identidad a la izquierda, form a la derecha.
- Eje de exploración: estructura de layout.
- Riesgos / trade-offs: en viewports medios el rail puede competir con el form; desktop-first por diseño (stack bajo `md`).

## Variante 4 — Exploratoria secciones

- Archivo: [`variant-4-exploratoria-secciones.html`](variant-4-exploratoria-secciones.html)
- Tesis: IA en cards apiladas (Información personal + Seguridad) en lugar de una mega-card; footer sticky “Guardar cambios”.
- Eje de exploración: arquitectura de información / secciones.
- Riesgos / trade-offs: más scroll; footer sticky puede chocar con chrome del dashboard real.

## Variante 5 — Experimental ink

- Archivo: [`variant-5-experimental-ink.html`](variant-5-experimental-ink.html)
- Tesis: “ink ledger” (espíritu consorcios/v4-3) — Source Serif 4 + IBM Plex Sans, papel cálido, bordes pesados, CTA azul filled.
- Reglas de AGENTS.md que rompe a propósito: neutros hue 255 → papel cálido; `shadow-card` suave → stroke ink; stack tipográfico del sistema → serif+plex.
- Riesgos: serif + papel puede no convivir con el resto del dashboard; útil como contraste, no como default.

## Variante 6 — Experimental dense

- Archivo: [`variant-6-experimental-dense.html`](variant-6-experimental-dense.html)
- Tesis: densidad Linear/Notion — filas label/control, hairlines, poco chrome de card; tokens hue 255 + primary conservados.
- Reglas / aire de AGENTS.md que tensiona: densidad editorial de collection screens vs settings compactos.
- Riesgos: demasiado denso para el resto del producto si se aplica global; bueno como patrón solo de settings.

## Ronda 2 — desde Variante 1 (helper correos + password abierta + dirección full-width)

Base: [`variant-1-evolutiva.html`](variant-1-evolutiva.html). Requisitos compartidos:

- Mensaje bajo “Información personal”: teléfono + dirección fiscal aparecen en los correos enviados.
- Dirección Fiscal en fila completa (dato largo: Av. Corrientes 1847…).
- Sección “Cambiar contraseña” abierta (mock): Cancelar + campos actual / nueva / confirmar.

### Variante 7 — Evolutiva v2

- Archivo: [`variant-7-evolutiva-v2.html`](variant-7-evolutiva-v2.html)
- Tesis: mismos tokens/shell que v1; aplica los tres fixes con mínima novedad visual (helper muted plain).

### Variante 8 — Exploratoria callout

- Archivo: [`variant-8-exploratoria-callout.html`](variant-8-exploratoria-callout.html)
- Tesis: disclosure como callout info suave (bg muted + borde primary + ícono).
- Eje: tratamiento del aviso de correos.

### Variante 9 — Exploratoria password panel ✅ integrada

- Archivo: [`variant-9-exploratoria-password-panel.html`](variant-9-exploratoria-password-panel.html)
- Tesis: password abierta como panel inset anidado dentro de la card.
- Eje: affordance del estado abierto vs botón colapsado.
- Portada a React: `src/components/profile/profile-form.tsx` (+ `description` / `labelAction` en `FormInput`).

### Variante 10 — Exploratoria field notes

- Archivo: [`variant-10-exploratoria-field-notes.html`](variant-10-exploratoria-field-notes.html)
- Tesis: resumen bajo el h2 + notas `text-xs` bajo Teléfono y Dirección Fiscal.
- Eje: disclosure a nivel de campo (más denso).

## Candidatos para AGENTS.md

- [ ] En settings, CTA secundaria (“Cambiar contraseña”) siempre outline/secondary con borde — nunca `primary` con opacidad.
- [ ] Email (u otros campos no editables) deben marcar readonly con helper o badge, no solo `disabled` visual ambiguo.
- [ ] Pantallas de settings pueden usar patrón de filas densas (label | control) distinto del aire editorial de collection screens — documentar la excepción.
- [ ] Identity strip opcional (avatar tile + nombre + email) arriba del form de perfil, alineado a tiles soft de consorcios.
- [ ] Squareline sigue siendo textura de columna principal; no re-montar por pantalla de settings si el shell ya lo lleva.
- [ ] En perfil: aviso explícito de que teléfono y dirección fiscal aparecen en correos salientes.
- [ ] Dirección fiscal siempre full-width (no compartir fila con teléfono).
- [ ] Estado abierto de “Cambiar contraseña” con Cancelar + panel/campos claros (no solo botón).
