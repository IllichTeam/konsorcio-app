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

# Package manager

Always use **pnpm** to install dependencies and run scripts — never npm or yarn (`pnpm add <pkg>`, `pnpm dlx <cli>`, `pnpm run <script>`).

# Forms

Forms use react-hook-form + zod (`zodResolver`). Before implementing any form, check `src/components/form/` and reuse the existing wrappers (e.g. `FormInput`). Never use the raw `src/components/ui/` components directly inside a form, and never wire `Controller` inline in a screen/page component: if a form needs a component that has no wrapper yet, first create that wrapper in `src/components/form/` following the existing Controller + ui pattern (label, error message from `fieldState`, `aria-invalid`/`aria-describedby`), then use it from the screen. Inline one-off implementations in the consuming screen are not acceptable.
