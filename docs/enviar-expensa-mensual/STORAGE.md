# Supabase Storage — expensas mensuales

El repo **no** gestiona Storage de forma declarativa (no hay
`supabase/config.toml` ni migraciones de Storage). El bucket y las policies
se crean **a mano** en el proyecto Supabase. Desde Fase 2 el código usa
`@supabase/supabase-js` **solo en servidor** (service role + signed URLs).

Constantes: `EXPENSE_EMAIL_STORAGE_BUCKET`,
`EXPENSE_EMAIL_STORAGE_PATH_PREFIX`, `EXPENSE_EMAIL_RETENTION_DAYS`,
`EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS` en
[`src/lib/schemas/expense-email.ts`](../../src/lib/schemas/expense-email.ts).

---

## Bucket

| Propiedad      | Valor                                                    |
| -------------- | -------------------------------------------------------- |
| Nombre         | `expense-emails`                                         |
| Visibilidad    | **Private** (no public read)                             |
| Path layout    | `{consortiumId}/{sendId}/{filename}` dentro del bucket   |
| Prefijo lógico | `expense-emails/{consortiumId}/{sendId}/…` (docs / logs) |
| MIME           | Solo `application/pdf` (validar en servidor al subir)    |
| Límites app    | 1–3 archivos; ≤ 5 MB c/u                                 |

En el Dashboard: **Storage → New bucket →** name `expense-emails` →
**Public bucket: off**.

---

## Policies (server-only + signed URLs)

Objetivo: el browser **nunca** habla con la service role ni lee el bucket
directo. Upload y lectura firmada van por rutas/handlers del servidor.

Recomendación MVP:

1. **Sin policies de acceso para `anon` / `authenticated`** sobre el bucket
   (o policies que denieguen todo). Así Storage solo es usable con la
   **service role** desde el servidor.
2. El servidor (service role) sube el PDF y, al enviar con Resend, genera
   una **signed URL** con TTL largo (suficiente para todo el fan-out, no
   60 s). Constante: `EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS` (6 h);
   helpers `createExpenseEmailSignedUrl(s)` en
   [`src/lib/storage/expense-emails.ts`](../../src/lib/storage/expense-emails.ts).
   En cada run/retry se **regeneran** (no se reutilizan URLs viejas).
3. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente ni a
   `NEXT_PUBLIC_*`. No loguear signed URLs ni la service role.

Si en el futuro se usan signed upload URLs desde el browser, acotar policies
por path `({consortiumId}/...)` y rol; **no** es el plan del MVP.

Ejemplo de policy denegatoria (opcional, si el proyecto crea policies por
defecto y querés dejarlo explícito):

```sql
-- Deny all for anon/authenticated; server uses service role (bypasses RLS).
CREATE POLICY "expense_emails_no_client_access"
ON storage.objects
FOR ALL
TO anon, authenticated
USING (bucket_id = 'expense-emails')
WITH CHECK (false);
```

Ajustar según el modelo de RLS de Storage del proyecto; lo importante es
**ningún acceso público** y **ninguna key peligrosa en el cliente**.

---

## Variables de entorno

Validadas en [`src/env.ts`](../../src/env.ts). Valores reales solo en `.env` /
Vercel, nunca en git. Placeholders en [`.env.example`](../../.env.example).

### Storage (server-only)

| Variable                    | Uso                                 |
| --------------------------- | ----------------------------------- |
| `SUPABASE_URL`              | URL del proyecto (API)              |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor: upload + signed URLs |

Opcionales al boot; al usar Storage sin ellas → error / 503 en upload.
**No** usar `NEXT_PUBLIC_SUPABASE_URL` / service role en el browser para este MVP.

### Email (Resend)

| Variable            | Uso                                                                        |
| ------------------- | -------------------------------------------------------------------------- |
| `RESEND_API_KEY`    | Envío real (sin ella, OTP/dev puede loguear; este feature falla al enviar) |
| `EMAIL_FROM`        | Remitente (`From`)                                                         |
| `EMAIL_OVERRIDE_TO` | Redirige todos los destinatarios a un inbox de prueba; asunto `[para: …]`  |

### App

| Variable                | Uso                                                          |
| ----------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_DEMO_MODE` | Si `true`, oculta botón + historial de expensa en el detalle |

Cliente Storage: [`src/lib/storage/supabase-admin.ts`](../../src/lib/storage/supabase-admin.ts)
(`server-only`). Helpers + signed URLs:
[`src/lib/storage/expense-emails.ts`](../../src/lib/storage/expense-emails.ts).
Upload: `POST /api/expense-emails/upload`.

**Paths:** object key = `{consortiumId}/{sendId}/{filename}` dentro del
bucket; `storagePath` canónico = `expense-emails/{consortiumId}/{sendId}/{filename}`
(el nombre del bucket no se duplica en el object key).

### Límite de body (plataforma)

Vercel suele limitar el body del request (~4.5 MB en algunos planes). El
flujo sube PDFs por multipart a Storage (no por tRPC JSON). Con 3 × 5 MB
puede fallar el upload en planes con techo bajo: verificar en deploy; si
duele, bajar el techo de la app o subir de a uno.

### Runtime / `after()`

- Upload route: `maxDuration = 60`
- `/api/trpc`: `maxDuration = 120` (techo del fan-out en `after()`)
- Plan Vercel debe permitir ≥ 120s en esa ruta; si el techo es 60s, cortes →
  recipients `pending` + **Reintentar pendientes**

---

## Retención 60 días + cleanup (manual)

**Decisión de producto:** borrar objetos (y eventualmente filas huérfanas)
después de **60 días** (`EXPENSE_EMAIL_RETENTION_DAYS`).

Este repo **no** tiene jobs/cron/lifecycle declarativo (`vercel.json` solo
define `regions`). **No** se implementó cleanup automático en Fase 6.

### Procedimiento operativo (manual)

1. En Supabase Dashboard → **Storage → `expense-emails`**, listar prefijos
   `{consortiumId}/{sendId}/` y borrar carpetas de envíos con más de 60 días
   (usar fecha del envío en la app / `expense_email_sends.created_at` como guía).
2. Opcional vía API (service role, **nunca** desde el browser): listar objetos
   del bucket y `remove` los keys viejos.
3. Filas DB: los envíos históricos pueden quedar; sin PDFs el retry de adjuntos
   fallará (aceptable tras retención). Borrar filas es opcional y fuera del MVP.
4. Huérfanos (upload OK, create cancelado): mismos paths sin fila en
   `expense_email_sends` — incluirlos en la pasada de limpieza periódica.

Frecuencia sugerida: revisión mensual si el volumen es bajo.

Cuando el repo tenga un mecanismo natural de cron/jobs, se puede añadir un
job que liste/elimine objetos > 60 días con service role. Hasta entonces la
retención es **requisito documentado**, no enforcement automático.

---

## Checklist operativo (manual — no ejecutar desde CI todavía)

- [ ] Crear bucket privado `expense-emails` en el proyecto Supabase.
- [ ] Confirmar que no hay policy de lectura pública.
- [ ] Guardar `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` solo en secretos
      de servidor (local `.env` / Vercel).
- [ ] Smoke: upload 1 PDF vía ruta server + signed URL que abre el PDF.
- [ ] Pasada manual de limpieza a 60 días (ver procedimiento arriba).
