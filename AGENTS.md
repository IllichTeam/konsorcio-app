<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Skills to apply during implementation

Load these skills **only when moving to implementation** (writing or modifying code), not during analysis, exploration, or planning. If the work is delegated to a subagent, that subagent loads the skill relevant to its task. Do not load them preemptively on every turn — pull them in at the moment code is about to be written for the matching domain.

**Never put a nested `AGENTS.md` inside a skill folder.** Cursor treats every `AGENTS.md` in the repo as an always-on workspace rule (that is what was inflating Rules ~26k tokens with `vercel-react-best-practices`). Skills expose a short `SKILL.md`; deep guides live as `REFERENCE.md` (or similar) and are read only when the skill is applied.

- **Frontend code** (React components, Next.js pages, hooks, UI, data fetching, bundle/performance): apply `vercel-react-best-practices`.
- **Backend / data layer** (database queries, fetching, models, ORM, schema, migrations):
  - apply `drizzle` for schema definitions, queries, and ORM patterns.
  - apply `supabase-postgres-best-practices` for Postgres query/schema optimization and database configuration.
- **Security / authentication** (auth setup, sessions, login, sign-up, password/credential handling, OAuth, plugins): apply `better-auth-best-practices`, and `email-and-password-best-practices` when it involves email/password flows.

Check the installed skills to confirm the exact name to invoke for the domain at hand. The goal is that these skills are pulled in at implementation time (or by the corresponding subagent), never loaded unconditionally.

# Design direction

Sober, precise — Linear/Vercel-inspired collection UI. Canonical visual reference: `design-variants/consorcios/v4/variant-2-final.html`. Rules for every screen:

- **Background is never pure white.** Light theme uses a cool gray canvas (`--background`, oklch hue 255) with near-white surfaces on top for hierarchy. Don't place large white surfaces directly on the canvas outside of shared surface tokens / `Card`.
- **Neutral scale shares one temperature.** All neutrals (background/card/muted/secondary/border/sidebar) live at oklch hue ~255 with low chroma. When adding tokens, keep them in that family — never mix warm grays in.
- **Cards**: `rounded-lg`, 1px `border-border`, soft shadow (`shadow-card` / hairline + light elevation). Hover may lift ~1px and strengthen the shadow slightly. Prefer `Card` or the same surface tokens — no one-off boxes with random chrome. Default padding 20px (`--card-spacing`); 16px with `size="sm"`.
- **Accent.** Primary blue is the only _strong_ color (primary actions, brand, focus). Soft multi-hue **identity tiles** (low chroma: blue/amber/violet/teal/rose/green) are allowed on collection cards for recognition. No rainbow chrome elsewhere. No marketing fill gradients.
- **Squareline.** 24px grid texture (`.grid-noise`) as a **top band on the authenticated main column** (via `DashboardShell`), with a bottom fade. Keep it subtle (primary tint ~12% alpha). Do not re-mount per screen, use as full-scroll background, or put on panels/cards.
- **Main column.** `DashboardShell` stretches page content to the full inset width (no `items-start`). Screen roots use `w-full`; when capping width with `max-w-*`, always pair with `mx-auto` so content does not pin left on wide viewports. Collection heroes may break out of shell padding (`-m-6 md:-m-10` + `overflow-x-clip`) and center in `mx-auto w-full max-w-[1120px] px-4 sm:px-6` — see `consortiums-screen.tsx`. Never introduce horizontal scroll (`overflow-x-clip` on the inset / breakout).
- **Density.** Compact for forms, tables, and chrome. Collection screens may use editorial air: larger H1 with `text-balance`, roomier hero, card `p-5`, grid `gap-4`+. In dense UI, `text-sm` remains the base.
- **Type.** No all-caps page titles or sustained uppercase UI. KPI/meta micro-labels may use small mono + uppercase + tracking (~10–11px).
- **Collection card pattern.** Metrics: muted label + `tabular-nums` value with vertical gap ≥ `mt-1.5`. Secondary CTA always has button chrome (border or fill), never plain blue text; pin actions with `mt-auto` so the grid baseline stays clean.
- **Motion.** Subtle and purposeful (`transform`/`opacity`, micro-interactions). Honor `prefers-reduced-motion` / `motion-reduce`.

# Language

Two languages, strictly separated:

- **Spanish** — everything the end user sees or reads:
  - UI copy (labels, buttons, placeholders, headings, empty states, toasts)
  - Validation / API error messages shown in the interface
  - **URL route segments** the user navigates (`/consorcios`, `/emails-inquilinos`, `/perfil-de-usuario`)
- **English** — everything that is part of the program, not the user-facing surface:
  - code identifiers (variables, functions, components, types, hooks)
  - comments, JSDoc, file and directory names under `src/`
  - config / env var names, git commit messages
  - **database table and column names**, Drizzle schema exports
  - enum values, query keys, tRPC procedure paths
  - internal/server log messages (`console.*`, thrown `Error` text not shown to the user)

**Database / domain naming (English only in code & DB):**

- Table names: English plural `snake_case` — e.g. `consortiums`, not `consorcios`; columns/fields like `owner_id`, `billing_email`.
- Drizzle exports, tRPC routers, hooks, types, and `src/` folders use the English domain noun (`consortium` / `consortiums`).
- Do **not** put Spanish product words into schema or identifiers. The brand "Konsorcio" and Spanish UI/URLs are fine; they must not leak into the database or TypeScript names.

**URLs stay Spanish.** App Router folders under `src/app` that define public paths should match the Spanish URL (`consorcios/`, not `consortiums/`). Internal component folders under `src/components/` stay English (`consortiums/`).

Rule of thumb: if a human reads it in the browser (URL bar, screen, toast, form error), it's Spanish; if only developers/tools touch it, it's English. Do not hardcode English UI copy.

**Zod validation messages are user-facing → Spanish.** A global Spanish locale is configured in `src/lib/zod.ts` via `z.config(z.locales.es())`, so default messages come out in Spanish automatically. **Always import Zod from `@/lib/zod`** (`import { z } from "@/lib/zod"`), never from `"zod"` directly — otherwise the locale may not be applied. Only pass an explicit `message` when the default wording isn't good enough for a field; that message must be in Spanish.

# Package manager

Always use **pnpm** to install dependencies and run scripts — never npm or yarn (`pnpm add <pkg>`, `pnpm dlx <cli>`, `pnpm run <script>`).

# Forms

Forms use react-hook-form + zod (`zodResolver`). Before implementing any form, check `src/components/form/` and reuse the existing wrappers (e.g. `FormInput`). Never use the raw `src/components/ui/` components directly inside a form, and never wire `Controller` inline in a screen/page component: if a form needs a component that has no wrapper yet, first create that wrapper in `src/components/form/` following the existing Controller + ui pattern (label, error message from `fieldState`, `aria-invalid`/`aria-describedby`), then use it from the screen. Inline one-off implementations in the consuming screen are not acceptable.

# Component reuse

Prefer reuse over new micro-components. Before painting UI, check whether something already exists in `src/components/ui/`, `src/components/form/`, or the relevant domain folder under `src/components/` — and use it. Do not invent a one-off screen-local variant when a shared primitive covers the case; extend the shared component if a gap is real.

**Tables:** always use `DataTable` / `DataTableSkeleton` from `src/components/ui/data-table.tsx` (TanStack Table: server offset pagination + local sort, `ColumnDef` for custom cells). Do not assemble raw `Table` primitives for data lists with pagination/sorting. If `DataTable` is missing a capability, extend that component rather than forking a parallel table in the screen.

# Data fetching

Client data loading goes through TanStack Query hooks in `src/hooks/`. Domain APIs live as tRPC procedures under `src/server/trpc/`; the client uses `@trpc/tanstack-react-query` (`queryOptions`, `mutationOptions`, `queryFilter`) so query keys stay inferred. Do **not** re-declare those keys in `src/lib/api/query-keys.ts`. Keep manual `query-keys.ts` entries only for modules still on the mock/`lib/api` layer. Never load remote data with `useEffect` + `useState`. Shared request/response Zod contracts belong in `src/lib/schemas/` and may be reused by forms when the UI shape matches the API; keep form-only schemas in the screen when the UI needs transformations (e.g. string amount → number).

# Linear work log

After finishing a meaningful task (feature, fix, migration, auth/config change, etc.), **ask** the user whether to search for or register a Linear issue before ending. Do not create or close issues silently.

Purpose: keep a shared done-log in Linear so the other project participant (and their AI) can see what landed. This is tracking, not backlog grooming.

Rules when the user agrees:

1. Project: **proyecto toro** (team **Irada**).
2. Search for an existing matching open/done issue first; reuse it if it fits.
3. If creating: one short Spanish title only — same style as existing issues (e.g. `Configurar drizzle`, `CRUD emails de inquilinos`, `Recuperar contraseña con OTP`, `Migrar middleware a proxy`). No long descriptions, acceptance criteria, or essays.
4. Mark the issue **Done**.

Skip for trivial edits (typo, formatting-only, drive-by renames) unless the user asks.
