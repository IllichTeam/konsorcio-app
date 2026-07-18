# Rúbrica de performance — happy path

Suite: `e2e/perf/happy-path.spec.ts`  
Setup y comandos: ver [README.md](./README.md).

## Targets

| Script                  | Target     | Base URL                                                             | Server                                 |
| ----------------------- | ---------- | -------------------------------------------------------------------- | -------------------------------------- |
| `pnpm test:perf`        | **local**  | `http://localhost:3200`                                              | build + `pnpm start` (PGlite / `.env`) |
| `pnpm test:perf:remote` | **remote** | `PERF_BASE_URL` o `BETTER_AUTH_URL` (desde `.env` + `.env.supabase`) | app desplegada (Vercel + Supabase)     |

Hoy el default histórico era solo local. Remote pega contra producción/staging real: crea, edita y borra consorcios de prueba (cleanup al final de cada iteración). Usá credenciales admin válidas en ese entorno (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

Override de URL remota:

```bash
PERF_BASE_URL=https://tu-app.vercel.app pnpm test:perf:remote
```

## Flujo medido

1. Carga de `/` (login)
2. Login email/password → `/consorcios`
3. Crear consorcio (diálogo)
4. Editar el consorcio creado (diálogo)
5. Cleanup: eliminar el consorcio

Cada corrida hace **5 iteraciones** en contexts limpios (sin cookies ni cache) y reporta **mediana** y **p95**.

Entre iteraciones la suite espera ~11s: Better Auth en producción limita `/sign-in` a **3 intentos / 10s**.

## Presupuestos (ms)

Rúbricas **separadas**: local (PGlite / localhost) vs remote (Vercel + Supabase + RTT).

### Local

| Métrica                                  | Verde  | Amarillo | Rojo   |
| ---------------------------------------- | ------ | -------- | ------ |
| TTFB `/`                                 | < 200  | < 500    | ≥ 500  |
| DCL `/`                                  | < 800  | < 1500   | ≥ 1500 |
| API login (`sign-in/email`)              | < 400  | < 800    | ≥ 800  |
| Login percibido (click → dashboard)      | < 1500 | < 3000   | ≥ 3000 |
| Navegación post-login (percibido − API)  | < 1000 | < 2200   | ≥ 2200 |
| Crear consorcio (click Guardar → toast)  | < 800  | < 1500   | ≥ 1500 |
| API tRPC `consortiums.create`            | < 300  | < 600    | ≥ 600  |
| Editar consorcio (click Guardar → toast) | < 800  | < 1500   | ≥ 1500 |
| API tRPC `consortiums.update`            | < 300  | < 600    | ≥ 600  |

### Remote

| Métrica                                  | Verde  | Amarillo | Rojo    |
| ---------------------------------------- | ------ | -------- | ------- |
| TTFB `/`                                 | < 800  | < 2500   | ≥ 2500  |
| DCL `/`                                  | < 2000 | < 5000   | ≥ 5000  |
| API login (`sign-in/email`)              | < 1500 | < 3000   | ≥ 3000  |
| Login percibido (click → dashboard)      | < 5000 | < 15000  | ≥ 15000 |
| Navegación post-login (percibido − API)  | < 4000 | < 12000  | ≥ 12000 |
| Crear consorcio (click Guardar → toast)  | < 2500 | < 5000   | ≥ 5000  |
| API tRPC `consortiums.create`            | < 1500 | < 3000   | ≥ 3000  |
| Editar consorcio (click Guardar → toast) | < 2500 | < 5000   | ≥ 5000  |
| API tRPC `consortiums.update`            | < 1500 | < 3000   | ≥ 3000  |

El test **falla** si la mediana de una métrica assertada cae en rojo. Amarillo solo imprime warning.

Timeout del test: **3 min** local / **10 min** remote (5 iters + waits de rate-limit).

## Cómo correr

```bash
# Local (build de producción + PGlite)
pnpm db:seed
pnpm test:perf

# Remoto (Vercel / staging) — sin build local
pnpm db:seed:prod   # solo si hace falta asegurar el admin en prod
pnpm test:perf:remote
```

### Comparativa opcional: modo dev local

```bash
# Terminal 1
pnpm dev

# Terminal 2 (reusa el server; no hace build)
PERF_TARGET=local pnpm test:e2e e2e/perf
```

## Interpretar el login lento

| Si…                             | Entonces…                                     |
| ------------------------------- | --------------------------------------------- |
| Local OK, remote lento          | red / Supabase / cold start Vercel            |
| API login alta, navegación baja | scrypt / DB                                   |
| API login baja, navegación alta | RSC/`router.refresh`/`getSession`/hidratación |
| Todo alto solo en `pnpm dev`    | compilación on-demand del dev server          |
| Todo alto en `pnpm test:perf`   | latencia real end-to-end local                |

Los JSON históricos quedan en `e2e/perf/results/` como `happy-path-{local|remote}-….json` (gitignored).
