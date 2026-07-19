# Rúbrica — Ronda 3: Selección de consorcios (light mode, sin expensas)

Cada variante debe pasar **todos** los criterios bloqueantes y obtener **≥ 4/5** en cada criterio de calidad. El subagente itera sobre su propio archivo hasta cumplir, y reporta la auto-evaluación completa al final.

## A. Criterios bloqueantes (pass/fail)

| #   | Criterio                                                                                                                                                                                                                                                                | Cómo verificar                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A1  | **Light mode estricto.** Canvas claro en toda la pantalla; ningún fondo oscuro dominante (sidebar, header y cards también claros). El fondo NUNCA es blanco puro `#fff` / `oklch(1 0 0)`: usar off-white o gris frío.                                                   | Inspección visual + buscar `#fff`/`white` como fondo de canvas                                   |
| A2  | **Cero rastro de expensas y período.** Prohibido: montos en `$`, las palabras "expensa(s)", "período"/"periodo", "Jul 2026"/"Julio 2026", "cobranza", "deuda", "emitir/emitida", cualquier KPI monetario. Esto aplica a labels, valores, chips, tooltips y aria-labels. | `grep -i` en el archivo por `$`, `expens`, `period`, `jul`, `cobra`, `deud` → 0 resultados de UI |
| A3  | **Copy 100 % en español** con datos realistas del dominio (direcciones de CABA, barrios, nombres diversos). Sin lorem ipsum, sin inglés visible al usuario.                                                                                                             | Lectura completa del copy                                                                        |
| A4  | **Autocontenido.** Abre vía `file://`: Tailwind browser CDN v4 (`https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4`), fuentes solo de `fonts.bunny.net`, sin `<script>` de lógica (CSS-only para hover/focus/animaciones de entrada).                                 | Revisar `<head>` y ausencia de JS                                                                |
| A5  | **Semántica y accesibilidad.** `<nav>/<main>/<header>` correctos, `aria-label` en iconos-botón, `aria-current` en nav activa, `focus-visible` visible en todo interactivo, `prefers-reduced-motion` respetado.                                                          | Auditoría del markup                                                                             |
| A6  | **Responsive hasta 768 px** sin overflow horizontal ni elementos rotos (grid colapsa, sidebar se oculta o adapta).                                                                                                                                                      | Razonar breakpoints en el markup                                                                 |
| A7  | **Contenido obligatorio presente:** título "Selección de consorcios", bienvenida a María González, CTA "Agregar nuevo consorcio", contadores 9 consorcios / 312 unidades, los 6 consorcios listados, acción "Enviar comentario" por consorcio, paginación (1, 2).       | Checklist contra los datos canónicos                                                             |

## B. Criterios de calidad (1–5, mínimo 4)

| #   | Criterio                                                                                                                                                                                                                                      | Qué mide   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| B1  | **Fidelidad al estilo asignado.** La variante se reconoce como Supabase / Apple / Linear / PostHog al primer vistazo (paleta, tipografía, densidad, trato de superficies característicos de esa referencia, traducidos a light mode).         | Identidad  |
| B2  | **Efecto WOW.** Existe UN momento memorable y justificado: hero/saludo con presencia, firma visual, animación de entrada escalonada en CSS, micro-interacciones con carácter. No decoración dispersa: un gesto fuerte, el resto disciplinado. | Impacto    |
| B3  | **Jerarquía tipográfica intencional.** Display + body elegidos a propósito (no Inter por defecto), pesos intermedios (500/600), tracking ajustado en títulos, `tabular-nums` para cifras.                                                     | Tipografía |
| B4  | **Cards con contenido útil sin dinero.** Cada consorcio comunica algo accionable: unidades, barrio, estado operativo (p. ej. avisos sin leer, reclamos abiertos, al día), actividad reciente. Footers y baselines alineados entre cards.      | Contenido  |
| B5  | **Estados e interacción.** Hover/active/focus en todo lo clickeable, transiciones 200–300 ms sobre `transform`/`opacity`/color, feedback de presión.                                                                                          | Vida       |
| B6  | **Sin defaults de IA.** Nada de gradiente violeta→azul, ni 3 columnas idénticas sin razón, ni sombras negras genéricas (tintarlas al hue del fondo), ni "Elevate/Seamless". Luz coherente en una sola dirección.                              | Criterio   |

## Datos canónicos (única fuente de verdad)

- Marca: **Konsorcio** — Panel de administración.
- Usuaria: **María González** — `m.gonzalez@konsorcio.ar` — iniciales MG.
- Navegación: Dashboard → **Consorcios** (activa), **Resumen**; Sistema → **Configuración**. Cerrar sesión en footer de usuario.
- Encabezado: breadcrumb `Dashboard · Consorcios`, H1 **"Selección de consorcios"**, subtítulo **"Bienvenida, María González"**, CTA primaria **"Agregar nuevo consorcio"**.
- Métricas globales permitidas: **9 consorcios activos**, **312 unidades administradas**. (Nada monetario.)
- Consorcios (página 1 de 2):

| Nombre            | Barrio             | Unidades |
| ----------------- | ------------------ | -------- |
| Av. Santa Fe 2154 | Recoleta, CABA     | 48       |
| Libertador 4310   | Palermo, CABA      | 72       |
| Torre Alem Plaza  | Retiro, CABA       | 96       |
| Cabildo 2478      | Belgrano, CABA     | 24       |
| Rivadavia 6320    | Caballito, CABA    | 36       |
| Malabia 1725      | Villa Crespo, CABA | 18       |

- Enriquecimiento permitido por card (inventado con criterio, NO monetario): avisos sin leer, reclamos abiertos, emails de inquilinos registrados, última actividad ("hace 2 h"), estado operativo.
- Acción por card: **"Enviar comentario"** + entrar al consorcio.
- Paginación: páginas 1 y 2, anterior deshabilitado.

## Formato de auto-evaluación (obligatorio en el reporte final del subagente)

```
A1..A7: PASS/FAIL cada uno (con evidencia de A2: resultado del grep)
B1..B6: puntaje /5 cada uno + 1 línea de justificación
Iteraciones realizadas: N (qué se corrigió en cada una)
```
