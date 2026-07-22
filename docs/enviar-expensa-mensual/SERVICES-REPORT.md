# SERVICES-REPORT — Enviar expensa mensual (operativo)

**Fecha:** 2026-07-21  
**Alcance:** migraciones, bucket Storage, smoke Storage, readiness Resend/override.  
**No se enviaron correos.** No se inventaron secretos ni se editó código de feature.

---

## 1. Inventario de entorno (sin secretos)

### Archivos

| Archivo                          | Estado                                            |
| -------------------------------- | ------------------------------------------------- |
| `.env`                           | presente                                          |
| `.env.supabase`                  | **ausente** (solo existe `.env.supabase.example`) |
| `.env.local` / `.env.production` | ausentes                                          |

### `.env` — presencia de claves relevantes

| Variable                    | Presente              | Notas no sensibles                                       |
| --------------------------- | --------------------- | -------------------------------------------------------- |
| `DB_DRIVER`                 | sí                    | `pglite`                                                 |
| `DATABASE_URL`              | clave sí, valor vacío | —                                                        |
| `DIRECT_DATABASE_URL`       | no                    | requerida por `pnpm db:migrate:prod` vía `.env.supabase` |
| `SUPABASE_URL`              | no                    | bloquea Storage                                          |
| `SUPABASE_SERVICE_ROLE_KEY` | no                    | bloquea Storage                                          |
| `RESEND_API_KEY`            | sí                    | prefijo `re_…`                                           |
| `EMAIL_FROM`                | sí                    | `ExpensasYa <noreply@notificaciones.expensasya.com>`     |
| `EMAIL_OVERRIDE_TO`         | **no**                | **bloquea envíos reales futuros**                        |
| `NEXT_PUBLIC_DEMO_MODE`     | sí                    | `false`                                                  |

Script establecido para Postgres real: `pnpm db:migrate:prod`  
(`node --env-file=.env --env-file=.env.supabase` + drizzle-kit migrate; `DB_DRIVER=postgres` + `DIRECT_DATABASE_URL` Session Pooler `:5432`).

---

## 2. Migración `0010_cuddly_silverclaw`

### Local (PGlite) — OK

| Ítem           | Resultado                                                   |
| -------------- | ----------------------------------------------------------- |
| Comando        | `pnpm db:migrate`                                           |
| Exit           | 0 — `migrations applied successfully!`                      |
| Tablas         | `expense_email_sends`, `expense_email_recipients` presentes |
| Columnas lease | `claim_token`, `claim_expires_at` en `expense_email_sends`  |
| Journal local  | 11 migraciones aplicadas (incluye `0010`)                   |
| Datos          | sin reset / sin borrado                                     |

### Postgres real (Supabase) — BLOQUEADO

| Ítem             | Resultado                                                                       |
| ---------------- | ------------------------------------------------------------------------------- |
| Comando previsto | `pnpm db:migrate:prod`                                                          |
| Bloqueo          | falta `.env.supabase` (y con ello `DIRECT_DATABASE_URL` / `DB_DRIVER=postgres`) |
| Acción           | **no ejecutado** — sin inventar URLs ni passwords                               |

---

## 3. Bucket Supabase `expense-emails` — BLOQUEADO

| Ítem            | Resultado                                                        |
| --------------- | ---------------------------------------------------------------- |
| Acción prevista | crear/verificar bucket privado `expense-emails` vía service role |
| Bloqueo         | `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ausentes en `.env`  |
| Público         | no verificado (no hubo API call)                                 |
| Service role    | no expuesto; no se logueó ninguna key                            |

---

## 4. Smoke Storage — BLOQUEADO (no ejecutado)

Pasos previstos (no corridos):

1. Upload PDF mínimo a prefijo smoke / consorcio aislado
2. Crear signed URL
3. Verificar GET firmado OK
4. Confirmar GET público denegado
5. `remove` del objeto temporal

**Motivo:** mismas credenciales Storage ausentes. Sin basura creada.

---

## 5. Readiness Resend / override

| Ítem                         | Estado                                        |
| ---------------------------- | --------------------------------------------- |
| `RESEND_API_KEY`             | presente                                      |
| `EMAIL_FROM`                 | presente                                      |
| `EMAIL_OVERRIDE_TO`          | **ausente** → **no listo para envíos reales** |
| Envío de mails en esta tarea | **ninguno** (por diseño)                      |

Hasta configurar `EMAIL_OVERRIDE_TO` con un inbox de prueba, **no** se deben autorizar envíos reales del feature (dominio / sandbox Resend).

---

## 6. Bloqueo único (confirmado)

Operativo real incompleto por configuración local insuficiente:

1. **Falta `.env.supabase`** → no se puede aplicar `0010` al Postgres real (`pnpm db:migrate:prod`).
2. **Faltan `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`** → no bucket ni smoke Storage.
3. **Falta `EMAIL_OVERRIDE_TO`** → override no configurado; gate para futuros envíos reales.

**Detención aquí** sin inventar valores. Reanudar cuando existan:

- `.env.supabase` poblado desde `.env.supabase.example` (credenciales ya autorizadas del proyecto),
- vars Storage server-only en `.env` (o el overlay que use el equipo),
- `EMAIL_OVERRIDE_TO` apuntando al inbox de QA.

Luego, en orden: `pnpm db:migrate:prod` → crear/verificar bucket privado → smoke Storage → (otra tarea) envío controlado con override.

---

## 7. Resumen ejecutivo

| Área                            | Resultado                                   |
| ------------------------------- | ------------------------------------------- |
| Migrate local PGlite `0010`     | **OK** (tablas + lease columns verificadas) |
| Migrate Postgres real           | **bloqueado** (sin `.env.supabase`)         |
| Bucket `expense-emails` privado | **bloqueado** (sin credenciales Storage)    |
| Smoke Storage                   | **bloqueado** / no ejecutado                |
| Resend API + From               | presentes                                   |
| `EMAIL_OVERRIDE_TO`             | **no configurado**                          |
| Correos enviados                | 0                                           |
| Código feature tocado           | no                                          |
