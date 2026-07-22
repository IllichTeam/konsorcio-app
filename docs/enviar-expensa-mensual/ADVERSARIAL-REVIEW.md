# Revisión crítica — Enviar expensa mensual

Documento para **humanos**: qué estaba mal o incompleto en el SPEC/PLAN, por qué importa, y qué se decidió antes de codear.

Fecha: 2026-07-21 · Todavía no hay código del feature.  
**Actualizado:** 2026-07-21 — todas las decisiones abiertas quedaron cerradas.

---

## ¿Se puede empezar a programar?

**Sí.** C1–C6 y los puntos menores están cerrados. Siguiente paso: **Fase 0** (schema + bucket Storage).

---

## Problemas críticos (cerrados)

### C1 — ¿Quién manda los correos: la pantalla “espera” o trabaja en segundo plano? ✅ Cerrado

**Decisión (2026-07-21):** **opción B** — crear el envío, ir a “estado”, y mandar en background.

1. El servidor guarda el envío y la lista de destinatarios.
2. Devuelve un id al toque.
3. La UI abre la pantalla de estado y va actualizando sola.
4. Los mails se mandan en segundo plano (no dependen de que el browser tenga el dialog abierto).
5. Si el servidor se cae a mitad: quedan destinatarios “pendientes” y se puede **reintentar pendientes**.

| Opción                                                           | Qué ve el usuario                       | Riesgo                                                                             |
| ---------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| A — Esperar en el dialog hasta terminar                          | Spinner largo; al final “listo” o error | Con 50 mails + PDFs el servidor puede cortar a los 60s y **no sabés qué se mandó** |
| **B — Crear el envío, ir a “estado”, y mandar en background** ✅ | Ves progreso / fallidos al toque        | Hay que programar ese “background” bien                                            |

---

### C2 — ¿Tablas nuevas o reusar el log de notificaciones? ✅ Cerrado

**Decisión (2026-07-21):** **opción A** — tablas nuevas solo para expensas, **vinculadas a cada consorcio/envío**.

- `expense_email_sends` + `expense_email_recipients`
- Ligadas a `consortium_id` / `send_id`
- Dejar `email_log` como está (notificaciones / comentarios)

El log viejo no alcanza: no está ligado a un consorcio, no guarda estado por persona, no sirve para reintentar solo pendientes/fallidos.

---

### C3 — ¿Hace falta al menos un PDF? ✅ Cerrado

**Decisión (2026-07-21):** **sí, mínimo 1 PDF** obligatorio.

- Sin PDF → botón Enviar deshabilitado.
- El servidor también rechaza el pedido si viene sin adjuntos.
- Aplicado en SPEC §2, §3.1 y §10.

---

### C4 — Nombre incorrecto de una variable de entorno ✅ Cerrado

**Decisión (2026-07-21):** usar en todos los docs el nombre real del código: **`EMAIL_OVERRIDE_TO`**.

| Incorrecto (no usar) | Correcto (implementado) |
| -------------------- | ----------------------- |
| `EMAIL_TO_OVERRIDE`  | `EMAIL_OVERRIDE_TO`     |

---

### C5 — ¿Cuántos PDFs y de qué tamaño? ✅ Cerrado

**Decisión (2026-07-21):**

- Máximo **3 PDFs** por envío.
- Máximo **5 MB por archivo**.
- Con 3 × 5 MB = 15 MB en crudo queda bajo el techo de Resend (~40 MB after Base64).
- Si se pasa: error claro en español **antes** de crear el envío (cliente + servidor).

---

### C6 — Cómo se suben los PDFs a Supabase (seguridad) ✅ Cerrado

**Decisión (2026-07-21):** **Supabase Storage**, bucket **privado** (MVP).

- Subida preferentemente por una **ruta del servidor** (el browser no habla directo con claves peligrosas).
- Carpetas: `expense-emails/{consortiumId}/{sendId}/archivo.pdf`.
- Links firmados con duración suficiente para **todo** el envío (no 60s).
- Nunca mandar la secret key (`sb_secret_…`) al navegador.
- Retención: **60 días** (ver punto menor 7).

---

## Cosas menores ✅ Cerradas

| #   | Tema                                | Decisión (2026-07-21)                                                               |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | Asunto del mail                     | **`Expensa Mensual`**                                                               |
| 2   | URL de la pantalla de estado        | **`/consorcios/[id]/envios/[envioId]`**                                             |
| 3   | Nombre del destinatario             | Ni nombre ni unidad: saludo fijo **`Vecino/a`**                                     |
| 4   | ¿Se puede apretar Enviar dos veces? | No: deshabilitar CTA + validar con cautela la doble pulsación (no crear dos envíos) |
| 5   | Reintentar vs continuar             | Una sola acción UI: **`Reintentar pendientes`** (cubre fallidos y pendientes)       |
| 6   | Preview del mail                    | Sale del **mismo template** que el mail real (server)                               |
| 7   | ¿Cuánto tiempo guardamos los PDFs?  | **60 días**                                                                         |
| 8   | Historial                           | Vive **dentro de cada consorcio** (no en Notificaciones admin)                      |

---

## Riesgos (para tener en la cabeza)

**Timeouts.** Mandar 50 mails con PDF puede tardar más de lo que Vercel deja vivir un request. Por eso C1 (background + pantalla de estado) no es “nice to have”.

**Tráfico de descarga (egress).** Si Resend baja cada PDF una vez por destinatario, 50 personas × 3 MB = ~150 MB por envío. En el plan gratis de Supabase eso se nota en pruebas. A volumen bajo del producto real suele estar OK; si duele, más adelante R2.

**Límite del body en Vercel.** No mandar los PDFs dentro del JSON de tRPC. Primero subir a Storage; después el “Enviar” solo manda referencias (rutas/nombres).

**Límite de Resend: 10 pedidos por segundo.** Ir de a poco (concurrencia controlada) y si Resend dice “demasiado rápido”, esperar y reintentar.

**Reply-To.** El mail sale “desde Konsorcio”, pero al responder debería ir al `billingEmail` del consorcio. Hay que probarlo mirando el mail real. Si no hay billing email, se omite Reply-To (no se rompe el envío).

**Seguridad de archivos.** Paths de Storage deben pertenecer a ese consorcio/usuario. Destinatarios solo de la lista de emails del consorcio (no emails inventados).

**Modo override.** Con `EMAIL_OVERRIDE_TO`, todos los mails llegan a la misma casilla de prueba. El asunto debería decir a quién iba en realidad (`[para: juan@…]`), si no QA no entiende nada.

---

## Qué está bien (no tocar)

- Este feature **aparte** de Notificaciones y de “Enviar comentario”.
- Remitente de la plataforma + **Responder a** el mail del consorcio (no fingir ser un Gmail ajeno).
- Con PDFs: un mail por persona (Resend no deja adjuntos en envío batch).
- PDFs en Storage, no en Postgres.
- Guardar resultado **por persona** para reintentar solo pendientes/fallidos.
- Mismo tipo de selector de destinatarios que el comentario.
- Template de mail **nuevo** (no romper el de notificaciones).
- En modo demo el botón no se muestra (ya está).
- Plan por fases: datos → envío → upload → API → dialog → pantalla de estado.

---

## Cambios aplicados al SPEC/PLAN

1. ✅ Flujo = devolver id + envío en background + pantalla que actualiza sola _(C1)_
2. ✅ Tablas = opción A (nuevas), ligadas a consorcio/envío, sin mezclar con `email_log` _(C2)_
3. ✅ Al menos 1 PDF; máximo **3** × **5 MB** _(C3 + C5)_
4. ✅ Variable `EMAIL_OVERRIDE_TO` _(C4)_
5. ✅ Bucket privado Supabase + subida por servidor + retención 60 días _(C6 + menor 7)_
6. ✅ Asunto `Expensa Mensual`; ruta `/consorcios/[id]/envios/[envioId]`
7. ✅ Saludo `Vecino/a`; CTA `Reintentar pendientes`; preview = mismo template; historial en el consorcio; anti doble-click
