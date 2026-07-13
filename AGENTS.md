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
