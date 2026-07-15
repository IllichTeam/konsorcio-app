<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Skills to apply during implementation

Load these skills **only when moving to implementation** (writing or modifying code), not during analysis, exploration, or planning. If the work is delegated to a subagent, that subagent loads the skill relevant to its task. Do not load them preemptively on every turn — pull them in at the moment code is about to be written for the matching domain:

- **Frontend code** (React components, Next.js pages, hooks, UI, data fetching, bundle/performance): apply `vercel-react-best-practices`.
- **Backend / data layer** (database queries, fetching, models, ORM, schema, migrations):
  - apply `drizzle` for schema definitions, queries, and ORM patterns.
  - apply `supabase-postgres-best-practices` for Postgres query/schema optimization and database configuration.
- **Security / authentication** (auth setup, sessions, login, sign-up, password/credential handling, OAuth, plugins): apply `better-auth-best-practices`, and `email-and-password-best-practices` when it involves email/password flows.

Check the installed skills to confirm the exact name to invoke for the domain at hand. The goal is that these skills are pulled in at implementation time (or by the corresponding subagent), never loaded unconditionally.

# Design direction

Sober, compact, precise — Linear/Apple-inspired. Rules for every screen:

- **Background is never pure white.** Light theme uses a cool gray canvas (`--background`, oklch hue 255) with near-white cards on top for hierarchy. Don't place large white surfaces directly on the canvas outside of `Card`.
- **Neutral scale shares one temperature.** All neutrals (background/card/muted/secondary/border/sidebar) live at oklch hue ~255 with low chroma. When adding tokens, keep them in that family — never mix warm grays in.
- **Cards are hairline flat**: 1px `border-border`, no shadow, `rounded-lg`, compact padding (20px default via `--card-spacing`, 16px with `size="sm"`). Group content in `Card` instead of ad-hoc boxes.
- **One accent.** The primary blue is the only strong color; use it sparingly (primary actions, brand, focus). Everything else stays neutral. No gradients, no decorative color.
- **Density over ornament**: compact spacing, `text-sm` as base inside cards, restrained radii. Motion is subtle and purposeful (micro-interactions, `motion-reduce` respected).

# Language

Two languages, strictly separated:

- **Spanish** — everything the end user reads: UI copy, labels, button text, placeholders, headings, empty states, toasts/notifications, and any validation or error message surfaced in the interface (e.g. zod messages that render in a form, or an API error meant to be shown).
- **English** — everything else, always: code identifiers (variables, functions, components, types, hooks), comments, JSDoc, file and directory names, config files, env var names, git commit messages, database/schema field names, enum values, query keys, route segments, and internal/server log messages (`console.*`, thrown `Error` text not shown to the user).

Rule of thumb: if a string is rendered to the user, it's Spanish; if it's part of the program or its configuration, it's English. Do not translate identifiers or config to Spanish, and do not hardcode English UI copy.

**Zod validation messages are user-facing → Spanish.** A global Spanish locale is configured in `src/lib/zod.ts` via `z.config(z.locales.es())`, so default messages come out in Spanish automatically. **Always import Zod from `@/lib/zod`** (`import { z } from "@/lib/zod"`), never from `"zod"` directly — otherwise the locale may not be applied. Only pass an explicit `message` when the default wording isn't good enough for a field; that message must be in Spanish.

# Package manager

Always use **pnpm** to install dependencies and run scripts — never npm or yarn (`pnpm add <pkg>`, `pnpm dlx <cli>`, `pnpm run <script>`).

# Forms

Forms use react-hook-form + zod (`zodResolver`). Before implementing any form, check `src/components/form/` and reuse the existing wrappers (e.g. `FormInput`). Never use the raw `src/components/ui/` components directly inside a form, and never wire `Controller` inline in a screen/page component: if a form needs a component that has no wrapper yet, first create that wrapper in `src/components/form/` following the existing Controller + ui pattern (label, error message from `fieldState`, `aria-invalid`/`aria-describedby`), then use it from the screen. Inline one-off implementations in the consuming screen are not acceptable.

# Data fetching

Client data loading goes through TanStack Query hooks in `src/hooks/`. Domain APIs live as tRPC procedures under `src/server/trpc/`; the client uses `@trpc/tanstack-react-query` (`queryOptions`, `mutationOptions`, `queryFilter`) so query keys stay inferred. Do **not** re-declare those keys in `src/lib/api/query-keys.ts`. Keep manual `query-keys.ts` entries only for modules still on the mock/`lib/api` layer. Never load remote data with `useEffect` + `useState`. Shared request/response Zod contracts belong in `src/lib/schemas/` and may be reused by forms when the UI shape matches the API; keep form-only schemas in the screen when the UI needs transformations (e.g. string amount → number).
