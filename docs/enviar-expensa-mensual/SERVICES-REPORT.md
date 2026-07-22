# SERVICES-REPORT — Enviar expensa mensual (operativo)

**Fecha:** 2026-07-22  
**Alcance:** migraciones, bucket Storage, smoke Storage, readiness Resend/override.  
**No se enviaron correos.** Secretos no se documentan (solo presencia de claves).

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
| `SUPABASE_URL`              | **sí**                | proyecto `irunwiijywgpshzwhuql`                          |
| `SUPABASE_SECRET_KEY`       | **sí**                | prefijo `sb_secret_…` (modelo moderno; no legacy JWT)    |
| `SUPABASE_SERVICE_ROLE_KEY` | no                    | **retirada** del código; no usar                         |
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

## 3. Bucket Supabase `expense-emails` — OK

| Ítem       | Resultado                                                                |
| ---------- | ------------------------------------------------------------------------ |
| Acción     | creado vía API con `SUPABASE_SECRET_KEY` (no existía; había otro bucket) |
| Nombre     | `expense-emails`                                                         |
| Público    | **no** (private)                                                         |
| Secret key | no expuesta en logs; no se documentó el valor                            |

---

## 4. Smoke Storage — OK (2026-07-22)

Pasos corridos:

1. Upload PDF mínimo a prefijo `{consortiumId}/{sendId}/smoke.pdf` — **OK**
2. Crear signed URL (TTL 60 s) — **OK**
3. GET firmado → body `%PDF…` status 200 — **OK**
4. GET público → denegado (status 400) — **OK**
5. `remove` del objeto temporal — **OK**

Sin basura residual en el bucket.

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

## 6. Bloqueos restantes

1. **Falta `.env.supabase`** → no se puede aplicar `0010` al Postgres real (`pnpm db:migrate:prod`).
2. **Falta `EMAIL_OVERRIDE_TO`** → override no configurado; gate para futuros envíos reales.
3. Vars Storage en **Vercel** (prod/preview) — pendiente si el deploy las necesita.

**Resuelto en esta pasada:** `SUPABASE_URL` + `SUPABASE_SECRET_KEY` en `.env` local; bucket + smoke Storage.

Reanudar cuando existan:

- `.env.supabase` poblado desde `.env.supabase.example`,
- `EMAIL_OVERRIDE_TO` apuntando al inbox de QA,
- (opcional) mismas vars Storage en Vercel.

Luego, en orden: `pnpm db:migrate:prod` → smoke end-to-end con override → QA browser.

---

## 7. Resumen ejecutivo

| Área                            | Resultado                                   |
| ------------------------------- | ------------------------------------------- |
| Migrate local PGlite `0010`     | **OK** (tablas + lease columns verificadas) |
| Migrate Postgres real           | **bloqueado** (sin `.env.supabase`)         |
| Bucket `expense-emails` privado | **OK** (creado 2026-07-22)                  |
| Smoke Storage                   | **OK**                                      |
| API keys modelo                 | **secret** (`sb_secret_…`); legacy retirado |
| Resend API + From               | presentes                                   |
| `EMAIL_OVERRIDE_TO`             | **no configurado**                          |
| Correos enviados                | 0                                           |
