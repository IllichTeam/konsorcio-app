# Performance E2E — instrucciones

Suite Playwright del happy path: **login → crear consorcio → editar consorcio → cleanup**.

Rúbrica de presupuestos (verde / amarillo / rojo): ver [RUBRICA.md](./RUBRICA.md).

## Prerrequisitos

1. Node ≥ 20, **pnpm**
2. Dependencias del repo (`pnpm install`)
3. Chromium de Playwright (una vez):

```bash
pnpm exec playwright install chromium
```

4. Variables de entorno (ver abajo)
5. Usuario admin seedado en el entorno que vayas a medir

## Configuración necesaria

### Siempre (local y remote)

En `.env` (ya usado por la app):

| Variable             | Uso                                |
| -------------------- | ---------------------------------- |
| `ADMIN_EMAIL`        | Login del test                     |
| `ADMIN_PASSWORD`     | Login del test (mín. 8 caracteres) |
| `BETTER_AUTH_SECRET` | Requerido por la app en local      |
| `BETTER_AUTH_URL`    | Local: `http://localhost:3200`     |

Los scripts cargan `.env` con `node --env-file=.env`.

### Solo local (`pnpm test:perf`)

| Variable / estado | Valor típico                                                  |
| ----------------- | ------------------------------------------------------------- |
| `DB_DRIVER`       | `pglite` (default)                                            |
| Base URL          | fija: `http://localhost:3200`                                 |
| Server            | el script hace `pnpm build` + Playwright levanta `pnpm start` |

Seed del admin en PGlite:

```bash
pnpm db:seed
```

### Solo remote (`pnpm test:perf:remote`)

Apunta a la app **desplegada** (Vercel + Supabase). No levanta server local.

| Variable                         | Dónde                              | Uso                                                                                       |
| -------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `PERF_BASE_URL`                  | `.env.supabase`, `.env`, o inline  | **Preferida.** URL del deploy, sin trailing slash. Ej: `https://konsorcio-app.vercel.app` |
| `BETTER_AUTH_URL`                | fallback si no hay `PERF_BASE_URL` | Debe ser la URL remota, **no** `localhost`                                                |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `.env`                             | Credenciales válidas en **ese** entorno                                                   |

El script carga `.env` y después `.env.supabase`:

```bash
PERF_TARGET=remote node --env-file=.env --env-file=.env.supabase …
```

Si `.env.supabase` solo tiene overrides de DB (sin URL de Vercel), seteá `PERF_BASE_URL` ahí o en la línea de comando.

Seed del admin en prod (solo si hace falta):

```bash
pnpm db:seed:prod
```

**Ojo:** remote crea, edita y **borra** consorcios reales de prueba en la DB de ese entorno (cleanup al final de cada iteración).

## Comandos

### Local (recomendado para baseline / CI mental)

```bash
pnpm db:seed
pnpm test:perf
```

Equivale a: build de producción → Playwright contra `http://localhost:3200` → 5 iteraciones → tabla en consola + JSON en `results/`.

### Remote (producción / staging)

```bash
# Opción A: PERF_BASE_URL en .env.supabase
pnpm test:perf:remote

# Opción B: inline
PERF_BASE_URL=https://tu-app.vercel.app pnpm test:perf:remote
```

### Dev server local (comparativa, no es el baseline)

```bash
# Terminal 1
pnpm dev

# Terminal 2
PERF_TARGET=local pnpm test:e2e e2e/perf
```

(`reuseExistingServer` reutiliza el proceso en `:3200`; no hace build.)

## Qué esperar al correr

- 5 iteraciones, context limpio cada una (sin cookies/cache)
- ~11s de espera entre iteraciones (rate limit de Better Auth en `/sign-in`: 3 / 10s en producción)
- Tabla final: mediana, p95, veredicto
- Falla el test si alguna métrica assertada queda en **rojo** (mediana)
- JSON histórico (gitignored):

```
e2e/perf/results/happy-path-local-….json
e2e/perf/results/happy-path-remote-….json
```

## Troubleshooting rápido

| Síntoma                                      | Qué chequear                                                          |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `ADMIN_EMAIL and ADMIN_PASSWORD must be set` | `.env` cargado; scripts usan `--env-file=.env`                        |
| `PERF_TARGET=remote requires PERF_BASE_URL…` | Seteá `PERF_BASE_URL` o `BETTER_AUTH_URL` remoto                      |
| `resolved to a local URL`                    | Remote no acepta `localhost`; usá la URL de Vercel                    |
| `sign-in failed: 429`                        | Rate limit; la suite ya espera 11s — no corras dos suites en paralelo |
| Login OK en local, falla en remote           | Admin distinto en prod → `pnpm db:seed:prod`                          |
| Todo lento solo con `pnpm dev`               | Normal: compile on-demand; medí con `pnpm test:perf`                  |
| `Test timeout of 120000ms exceeded`          | Versión vieja del config; remote necesita ~10 min (ya ajustado)       |
| `login=-Ns` / `api=0ms`                      | Bug de medición (Date.now / race); fixed con `performance.now()`      |

## Métricas report-only (no fallan el suite)

Además de las assertadas, el JSON/tabla incluye:

| Métrica                             | Significado                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `listApi`                           | RTT de `consortiums.list` en cliente; **0** si vino hidratado por SSR           |
| `byIdApi`                           | RTT de `consortiums.byId` al editar; **0** si el dialog usa `initialConsortium` |
| `authRoundTrips` / `trpcRoundTrips` | Cantidad de responses `/api/auth` y `/api/trpc` por iteración                   |
| `vercelRegion` (campo JSON)         | Valor crudo de `x-vercel-id` (p. ej. `gru1::iad1::…`)                           |

## Región Vercel ↔ Supabase

- Supabase: São Paulo (confirmado).
- Antes del pin: `x-vercel-id` mostraba edge `gru1` pero function region `iad1` (US East) → RTT alto a la DB.
- En repo: [`vercel.json`](../../vercel.json) con `"regions": ["gru1"]` + `preferredRegion = "gru1"` en auth/trpc/dashboard. Tras deploy, el segmento de function debería ser `gru1`.

## Baseline post-opt (local, 2026-07-18)

Mediana local tras cookieCache, SSR list, single-query update y cache `setQueryData`:

- login percibido ~207ms, create ~162ms, **edit ~68ms**
- `listApi=0`, `byIdApi=0` (prefetch + initial data)

Re-medir remote con `pnpm test:perf:remote` **después** de deployar estos cambios; no aflojar `REMOTE_RUBRIC` — solo endurecer si el nuevo baseline es estable.

## Archivos de esta carpeta

| Archivo              | Rol                               |
| -------------------- | --------------------------------- |
| `README.md`          | Este runbook (config + comandos)  |
| `RUBRICA.md`         | Presupuestos e interpretación     |
| `rubric.ts`          | Presupuestos usados por el assert |
| `report.ts`          | Mediana / p95 / tabla / JSON      |
| `happy-path.spec.ts` | Spec Playwright                   |
| `results/`           | Salidas JSON (ignoradas por git)  |
