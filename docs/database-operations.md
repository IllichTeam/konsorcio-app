# Database operations

Portable runbook for deploying, migrating, seeding, and recovering the
PostgreSQL database used by Konsorcio. Local development defaults to PGlite;
production (and Vercel Preview) use a hosted Postgres (currently Supabase).

For day-to-day product docs, see the root [README](../README.md).

## Requirements

| Requirement               | Notes                                                                   |
| ------------------------- | ----------------------------------------------------------------------- |
| Node.js ≥ 20, pnpm        | See `packageManager` in `package.json`                                  |
| PostgreSQL 15+ compatible | Same dialect as Drizzle `postgresql` migrations in `drizzle/`           |
| Network access            | From the machine that runs migrations to the DB host                    |
| Privileges                | Create/alter tables, indexes, and the Drizzle migrations journal schema |

### Environment variables

| Variable                         | Who reads it      | Purpose                                                                                               |
| -------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `DB_DRIVER`                      | App + Drizzle Kit | `pglite` (local) or `postgres` (hosted)                                                               |
| `DATABASE_URL`                   | App runtime       | Transaction-mode pooler (`:6543` on Supabase). Serverless client uses `prepare: false` and `max: 1`   |
| `DIRECT_DATABASE_URL`            | Drizzle Kit only  | Direct Postgres or session-mode pooler (`:5432`). Used by `pnpm db:migrate` / `db:push` / `db:studio` |
| `BETTER_AUTH_SECRET`             | App               | Session signing (≥ 32 chars)                                                                          |
| `BETTER_AUTH_URL`                | App               | Canonical public URL                                                                                  |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `pnpm db:seed`    | Idempotent first admin                                                                                |
| `RESEND_API_KEY` / `EMAIL_FROM`  | App               | Transactional email                                                                                   |

Never commit real secrets. Copy from [`.env.example`](../.env.example).

### Local smoke against Supabase (`.env.supabase`)

To test connection / migrations against the hosted DB without changing day-to-day
PGlite `.env`:

1. `cp .env.supabase.example .env.supabase` and replace `PROJECT_REF`, `REGION`, and `[PASSWORD]` in both URLs.
2. Run (loads `.env` then `.env.supabase` so auth/admin stay local, DB points at Supabase):

   ```bash
   pnpm db:migrate:prod
   pnpm db:seed:prod      # optional
   pnpm dev:prod
   ```

Do **not** put production `DATABASE_URL` in `.env`: the runtime treats a
`postgres://` URL as Postgres even when `DB_DRIVER=pglite`.

**Preview vs Production:** Preview deployments may share the Production
`DATABASE_URL`. They can read and write real data. Migrations are **never**
run automatically from Preview or from `next build` — only via the manual
commands below against Production credentials.

---

## Portable commands (any Postgres provider)

These work as long as `DB_DRIVER=postgres` and the URLs point at a compatible
database.

### 1. Validate connectivity (optional)

```bash
# Session / direct URL — for migrations
psql "$DIRECT_DATABASE_URL" -c 'select 1'

# Transaction pooler — for app runtime (if your client supports it)
psql "$DATABASE_URL" -c 'select 1'
```

### 2. Generate a migration (after schema edits)

```bash
# Schema: src/db/schema.ts (and auth-schema via better-auth CLI when needed)
pnpm db:generate
# Review SQL under drizzle/, then commit drizzle/ with the code change
```

### 3. Apply pending migrations

```bash
# From a filled `.env.supabase` (preferred local path)
pnpm db:migrate:prod

# Or inline
DB_DRIVER=postgres DIRECT_DATABASE_URL='postgresql://...' pnpm db:migrate
```

Or, with Production env already loaded (see Supabase/Vercel section):

```bash
pnpm dlx vercel@latest env run -e production -- pnpm db:migrate
```

Do **not** use `pnpm db:push` against production. Push is for local/prototype
only (PGlite or a disposable DB).

### 4. Seed the permanent admin

Requires migrations already applied. Uses the **runtime** client (`DATABASE_URL`):

```bash
pnpm db:seed:prod

# Or inline
DB_DRIVER=postgres \
DATABASE_URL='postgresql://...:6543/postgres' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_PASSWORD='...' \
pnpm db:seed
```

### 5. Smoke checks after migrate / deploy

- App loads and sign-in works with the seeded admin.
- Domain tables exist (`consortiums`, `email_log`, better-auth tables).
- Drizzle journal table has the latest migration hash (re-running
  `pnpm db:migrate` is a no-op).

### 6. Deploy order and rollback

| Change type                                                     | Order                                                                                  |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Additive / backward-compatible (new nullable column, new table) | Migrate → deploy                                                                       |
| Breaking (rename/drop column, NOT NULL without default)         | Expand → deploy dual-write/read → migrate data → deploy new code → contract (drop old) |

**App rollback:** redeploy the previous Vercel deployment. Do **not** reverse
SQL migrations by hand unless you have a tested down-migration. Prefer
expand/contract so the previous app revision still runs against the current
schema.

---

## Bootstrap from an empty database (“start from zero”)

Use this when creating a new Supabase project or switching Postgres providers.

1. Create database + role with DDL privileges.
2. Set `DIRECT_DATABASE_URL` to a direct or session-mode URL.
3. Apply all committed migrations:

   ```bash
   DB_DRIVER=postgres DIRECT_DATABASE_URL='...' pnpm db:migrate
   ```

4. Seed admin:

   ```bash
   DB_DRIVER=postgres DATABASE_URL='...' ADMIN_EMAIL='...' ADMIN_PASSWORD='...' pnpm db:seed
   ```

5. Point the app at `DATABASE_URL` (transaction pooler if available) and
   `DB_DRIVER=postgres` in the host (Vercel Production + Preview).
6. Deploy and run smoke checks.
7. Store `DIRECT_DATABASE_URL` only where operators run migrations (e.g. Vercel
   Production env), not in client bundles.

Migrations rebuild **schema** only. They do **not** restore application data.

---

## Checklist: each production migration / deploy

Copy and fill:

```
[ ] Owner: _______________
[ ] Backup taken if change is destructive / irreversible (pg_dump)
[ ] Schema change reviewed; SQL under drizzle/ reviewed
[ ] Compatibility: additive vs expand/contract decided
[ ] pnpm db:generate committed (if schema changed)
[ ] pnpm db:migrate applied to production (DIRECT_DATABASE_URL)
[ ] pnpm db:seed only if provisioning / resetting admin intentionally
[ ] Deploy to Vercel Production
[ ] Smoke: login, one consortium list/create, email path if relevant
[ ] Preview checked (shares prod DB — avoid destructive manual tests)
```

---

## Backup and provider migration

### Dump / restore

```bash
# Dump (custom format)
pg_dump "$DIRECT_DATABASE_URL" -Fc -f konsorcio-$(date +%Y%m%d).dump

# Restore into a new empty database
pg_restore --clean --if-exists -d "$NEW_DIRECT_DATABASE_URL" konsorcio-YYYYMMDD.dump
```

After restore (or after migrate-only bootstrap on a new empty DB), update
`DATABASE_URL` / `DIRECT_DATABASE_URL` in Vercel and redeploy.

### Schema-only on a new provider

If you cannot dump data: run `pnpm db:migrate` on the new empty DB, then
re-seed admin and re-enter data manually or via import scripts. Data is not
in `drizzle/`.

### Provider-specific notes (Supabase today)

- **Runtime:** Transaction Pooler port `6543` → `DATABASE_URL`.
- **Migrations:** Direct `db.<ref>.supabase.co:5432` or Session Pooler
  `5432` → `DIRECT_DATABASE_URL`. Prefer Session Pooler if the operator
  network is IPv4-only and direct requires IPv6.
- **Free plan:** inactive projects may pause (~7 days). Keep-alive crons are
  not a contractual guarantee; Pro avoids inactivity pause.
- Record any future provider-specific extensions (e.g. `vector`) here when
  introduced; current migrations use stock Postgres features
  (`gen_random_uuid`, etc.).

### Vercel wiring

| Env        | `DB_DRIVER` | `DATABASE_URL`                   | `DIRECT_DATABASE_URL`                 |
| ---------- | ----------- | -------------------------------- | ------------------------------------- |
| Production | `postgres`  | Transaction pooler               | Direct / session (operators)          |
| Preview    | `postgres`  | Same as Production (shared data) | Optional; do not migrate from Preview |

Manual migrate from a linked local checkout:

```bash
pnpm dlx vercel@latest link   # once
pnpm dlx vercel@latest env run -e production -- pnpm db:migrate
```

Ensure `DIRECT_DATABASE_URL` is present in Production before that command.
