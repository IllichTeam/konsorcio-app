# Konsorcio

Next.js app for consortium management. Local development uses **PGlite**;
production uses **Supabase Postgres** on Vercel.

## Getting started

```bash
pnpm install
cp .env.example .env   # fill BETTER_AUTH_SECRET at minimum for auth
pnpm db:migrate        # applies drizzle/ to local .pglite (default DB_DRIVER)
pnpm db:seed           # optional — needs ADMIN_EMAIL / ADMIN_PASSWORD
pnpm dev               # http://localhost:3200
```

## Database

| Script                 | Purpose                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `pnpm db:generate`     | Emit SQL under `drizzle/` from `src/db/schema.ts`                                          |
| `pnpm db:migrate`      | Apply pending migrations (PGlite locally; `DIRECT_DATABASE_URL` when `DB_DRIVER=postgres`) |
| `pnpm db:push`         | Schema push — **local / prototype only**, never production                                 |
| `pnpm db:seed`         | Idempotent admin user                                                                      |
| `pnpm db:studio`       | Drizzle Studio                                                                             |
| `pnpm db:migrate:prod` | Migrate against Supabase (loads `.env` then `.env.supabase`)                               |
| `pnpm db:seed:prod`    | Seed admin against Supabase                                                                |
| `pnpm db:studio:prod`  | Studio against Supabase                                                                    |
| `pnpm dev:prod`        | `next dev` against Supabase (smoke connection before deploy)                               |

**Smoke local → Supabase before deploy:**

```bash
cp .env.supabase.example .env.supabase   # replace PROJECT_REF, REGION, PASSWORD
pnpm db:migrate:prod
pnpm db:seed:prod                        # if admin not provisioned yet
pnpm dev:prod                            # http://localhost:3200
```

Keep day-to-day `.env` on `DB_DRIVER=pglite`. Do **not** put production URLs in
`.env` — a set `DATABASE_URL` can switch the runtime to Postgres even when
`DB_DRIVER=pglite`.

**Production migrations are manual.** Do not run them in `next build` or from
Preview deploys.

Typical production schema change:

1. Edit `src/db/schema.ts` → `pnpm db:generate` → review and commit `drizzle/`.
2. Apply: `pnpm dlx vercel@latest env run -e production -- pnpm db:migrate`
   (requires `DB_DRIVER=postgres` and `DIRECT_DATABASE_URL` in Vercel Production).
3. Deploy the app that depends on the new schema.
4. For breaking renames/drops, use expand/contract (see runbook).

**Connection split (production):**

- `DATABASE_URL` — Transaction Pooler (`:6543`) for the running app (and Preview).
- `DIRECT_DATABASE_URL` — Direct or Session Pooler (`:5432`) for Drizzle Kit only.

Full operator checklist, bootstrap-from-empty, backup/restore, and provider
switch: **[docs/database-operations.md](docs/database-operations.md)**.

## Scripts

```bash
pnpm dev
pnpm dev:prod
pnpm build
pnpm start
pnpm lint
pnpm test
pnpm format
```
