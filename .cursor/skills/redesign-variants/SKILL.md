---
name: redesign-variants
description: Generate 2-3 static HTML/Tailwind design variants for an existing screen or section of the Konsorcio app, with no logic wired in, so the user can compare directions before implementing. Use when the user asks to redesign, explore, or improve the design of an existing screen/section, mentions "variantes", "maquetas", "mockups", "rediseñar", or attaches a screenshot of the current UI asking for design alternatives.
---

# Redesign Variants

Produce 2-3 self-contained HTML/Tailwind mockups of an existing section so the user can open them in a browser, compare, and pick a direction. Exploration is the goal: variants MAY break the AGENTS.md design rules deliberately — winning ideas get folded back into AGENTS.md later.

## Workflow

1. **Ground in the real thing.** Read the actual component code for the target section under `src/`. If the user attached a screenshot, treat it as the source of truth for current state and reuse its real copy and data in the variants. Never invent a layout disconnected from what exists.
2. **Capture current tokens.** Read `src/app/globals.css` (`:root` oklch variables, `--radius`, fonts). Variant 1 must reuse them; the others may diverge.
3. **Pull in design criteria.** Read these before designing (audit checklist and aesthetic direction):
   - `.agents/skills/redesign-existing-projects/SKILL.md` — run its Design Audit against the current section to find weak points worth attacking.
   - `.claude/skills/frontend-design/SKILL.md` — for the more experimental variant's direction.
   - `.agents/skills/web-design-guidelines/SKILL.md` — also audit the current component code against the Vercel Web Interface Guidelines (a11y, focus states, forms, truncation, animation). Its `file:line` findings feed Variant 1 directly.
   - `.claude/skills/ui-ux-pro-max/SKILL.md` — **only as inspiration for Variants 2-3**: run targeted queries like `python .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --domain style|color|typography` (use that literal repo path; ignore the `${CLAUDE_PLUGIN_ROOT}` prefix in its SKILL.md — that env var doesn't exist here). **Never** use `--design-system --persist` in this repo: AGENTS.md is the design-system source of truth and a generated `MASTER.md` would compete with it. Variant 1 doesn't need this skill at all — its direction is fixed by AGENTS.md.
4. **Assign one thesis per variant.** Each variant needs a distinct, stated point of view:
   - **Variant 1 — Evolutiva**: same design system (tokens, flat cards, blue accent), but fixes everything the audit flagged: hierarchy, spacing, alignment, density, states.
   - **Variant 2 — Exploratoria**: departs on ONE major axis (layout structure, density, navigation pattern, typography scale) while staying sober.
   - **Variant 3 — Experimental** (optional, include when the user wants bolder options): a justified aesthetic risk. May break AGENTS.md rules (different accent, dark surface, different type pairing) — but must still feel like a serious admin product, not a marketing page.
5. **Build the files** in `design-variants/<section-slug>/` (see template below).
6. **Write `notes.md`** in the same folder, **in Spanish** (the user reads it), following the notes template.
7. **QA the generated HTML.** Re-apply `web-design-guidelines` to the variant files before delivering. Mockups still must pass the code-level checks that survive static HTML: visible `:focus-visible` states, labels tied to inputs, `alt`/`aria-label` on images and icon-only buttons, truncation/`min-w-0` on long text, `tabular-nums` on amount columns, `prefers-reduced-motion` respected. Fix findings instead of listing them; skip only rules that require JS behavior.
8. **Show the result.** Tell the user the file paths and a one-line thesis per variant. If a browser tool is available, screenshot each variant and include the images in the response.

## Variant file template

One `.html` file per variant (`variant-1-evolutiva.html`, etc.), fully self-contained, openable via `file://`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Variante 1 — Evolutiva · [sección]</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    <style type="text/tailwindcss">
      @theme {
        /* Variant 1: copy real values from src/app/globals.css.
         Variants 2-3: define your own tokens here. */
        --color-background: oklch(0.962 0.004 255);
        --color-foreground: oklch(0.21 0.02 250);
        --color-card: oklch(0.995 0.002 255);
        --color-primary: oklch(0.5 0.134 242.749);
        --color-border: oklch(0.895 0.006 255);
        --color-muted-foreground: oklch(0.5 0.015 250);
        --radius-lg: 0.625rem;
      }
    </style>
    <!-- Fonts: variant 1 uses the app font; variants 2-3 may load alternatives (e.g. fonts.bunny.net) -->
  </head>
  <body class="bg-background text-foreground antialiased">
    <!-- Render ONLY the target section at realistic size, with enough surrounding
       context (page header, sidebar hint) to judge it in situ -->
  </body>
</html>
```

Rules for the markup:

- **No JavaScript logic.** Hardcoded data only. CSS-only hover/focus/transition states are encouraged; interactive behavior (modals opening, tabs switching) is not required — show the most representative state, or render two states side by side if a state matters.
- **UI copy in Spanish**, matching the app's existing wording where it exists.
- **Realistic domain data** (consorcios, unidades, expensas, inquilinos, montos tipo `$184.320,50`, nombres reales diversos). No lorem ipsum, no "John Doe", no round fake numbers.
- **Icons**: inline SVG (Lucide outlines are fine for variant 1; variants 2-3 may use a different stroke style if the thesis calls for it).
- **Responsive** at least down to 768px; note in `notes.md` if a variant is desktop-first by design.
- Never modify anything under `src/` in this workflow — output goes only to `design-variants/`.

## notes.md template

```markdown
# Variantes: [sección]

## Variante 1 — Evolutiva

- Tesis: ...
- Qué cambia respecto al actual: ...
- Hallazgos del audit que corrige: ...

## Variante 2 — Exploratoria

- Tesis: ...
- Eje de exploración: ...
- Riesgos / trade-offs: ...

## Variante 3 — Experimental

- Tesis: ...
- Reglas de AGENTS.md que rompe a propósito y por qué: ...

## Candidatos para AGENTS.md

- [ ] Idea concreta que valdría la pena volver regla del sistema de diseño
```

The "Candidatos para AGENTS.md" section is mandatory: the whole point of experimenting is harvesting rules for the design system.

## After the user picks

Implementation of the chosen variant is a separate task (React + project components + AGENTS.md rules apply again in full). Do not auto-implement; wait for the user's pick.
