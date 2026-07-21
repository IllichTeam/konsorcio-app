# Revisión crítica — Enviar expensa mensual

Documento para **humanos**: qué está mal o incompleto en el SPEC/PLAN, por qué importa, y qué hay que decidir antes de codear.

Fecha: 2026-07-21 · Todavía no hay código del feature.

---

## ¿Se puede empezar a programar?

**Todavía no del todo.** La idea del producto está clara y reutiliza bien lo que ya existe (Resend, emails de inquilinos, modal de comentario). Pero hay **varias decisiones abiertas** que, si no se cierran, cada quien va a implementar algo distinto.

Hay que cerrar al menos los puntos **C1, C2 y C5** (y C6 de storage) antes de tocar la base de datos (Fase 0). **C3 y C4 ya están cerrados.**

---

## Problemas críticos (decidir antes de codear)

### C1 — ¿Quién manda los correos: la pantalla “espera” o trabaja en segundo plano?

**En criollo:** Cuando apretás “Enviar”, ¿la app se queda pensando hasta mandar los 50 mails, o te lleva ya a una pantalla de progreso y sigue mandando atrás?

Hoy el SPEC mezcla las dos ideas (a veces dice “devolver el id y navegar”, a veces “hacer el envío en el mismo pedido HTTP”). Son comportamientos distintos.

| Opción                                                    | Qué ve el usuario                       | Riesgo                                                                             |
| --------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| A — Esperar en el dialog hasta terminar                   | Spinner largo; al final “listo” o error | Con 50 mails + PDFs el servidor puede cortar a los 60s y **no sabés qué se mandó** |
| B — Crear el envío, ir a “estado”, y mandar en background | Ves progreso / fallidos al toque        | Hay que programar ese “background” bien (recomendado)                              |

**Decisión recomendada:** opción B.

1. El servidor guarda el envío y la lista de destinatarios.
2. Devuelve un id al toque.
3. La UI abre la pantalla de estado y va actualizando sola.
4. Los mails se mandan en segundo plano (no dependen de que el browser tenga el dialog abierto).
5. Si el servidor se cae a mitad: quedan destinatarios “pendientes” y se puede **continuar / reintentar**.

---

### C2 — ¿Tablas nuevas o reusar el log de notificaciones?

**En criollo:** ¿Dónde guardamos “este envío de expensa del consorcio X, a estas personas, con este resultado”?

Hoy existe `email_log` (notificaciones / comentarios). Ese log:

- no está ligado a un consorcio,
- no guarda el estado **por persona** (solo una lista),
- no alcanza para “reenviar solo los que fallaron”.

El SPEC deja dos caminos abiertos (A = tablas nuevas, B = adaptar el log viejo).

**Decisión recomendada:** tablas nuevas solo para expensas (`expense_email_sends` + `expense_email_recipients`). Dejar el log viejo como está para notificaciones y comentarios.

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

Corregido en SPEC. QA/PLAN ya usaban el nombre bueno.

---

### C5 — ¿Cuántos PDFs y de qué tamaño total?

**En criollo:** Resend no acepta un mail “infinito”. El límite real es ~**40 MB** del mensaje **después** de codificar los adjuntos (eso infla el tamaño ~33%).

Si permitimos 10 PDFs de 5 MB cada uno → 50 MB en crudo → se pasa del límite y Resend rechaza el envío.

Hoy: el SPEC no fija cantidad máxima; el PLAN sugiere “hasta 10” sin mirar ese techo.

**Decisión recomendada:**

- Máximo **5 PDFs** por envío.
- Máximo **5 MB por archivo** (ya acordado).
- Además, la **suma** de todos los PDFs no puede pasar ~**25 MB** en crudo (margen de seguridad bajo el límite de Resend).
- Si se pasa: error claro en español **antes** de crear el envío.

---

### C6 — Cómo se suben los PDFs a Supabase (seguridad)

**En criollo:** Los PDFs tienen que vivir un rato en Supabase para que Resend los pueda bajar. Mal configurado = cualquiera con el link ve liquidaciones, o el browser no puede subir, o Resend no puede leer el archivo.

Todavía no hay bucket ni reglas en el repo.

**Decisión recomendada (MVP):**

- Bucket **privado**.
- Subida preferentemente por una **ruta del servidor** (el browser no habla directo con claves peligrosas).
- Carpetas del estilo: `expense-emails/{id-consorcio}/{id-envio}/archivo.pdf`.
- Los links que usa Resend deben durar **todo** el envío (si el link vence a los 60s y mandás 50 mails, fallan a mitad).
- Nunca mandar la “service role” key al navegador.

---

## Cosas menores pero conviene cerrarlas

| #   | Tema                                | Pregunta simple                                          | Sugerencia                                                  |
| --- | ----------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | Asunto del mail                     | ¿`Expensas Mensual` está bien o preferís otra redacción? | Ej. `Expensa mensual`                                       |
| 2   | URL de la pantalla de estado        | ¿`/envios/` o `/expensas/`?                              | `/consorcios/[id]/envios/[envioId]`                         |
| 3   | Nombre del destinatario             | En la DB no hay “nombre”; hay unidad (depto)             | Igual que en comentario: mostrar la unidad                  |
| 4   | ¿Se puede apretar Enviar dos veces? | Evitar dos envíos iguales                                | Deshabilitar botón + ignorar duplicado corto                |
| 5   | Reintentar vs continuar             | Falló vs se cortó el servidor                            | “Reenviar fallidos” ≠ “Continuar pendientes” (ambos útiles) |
| 6   | Preview del mail                    | ¿De dónde sale el HTML?                                  | Mismo template que el mail real (server)                    |
| 7   | ¿Cuánto tiempo guardamos los PDFs?  | 90 días vs para siempre                                  | 90 días, o mientras exista el registro del envío            |
| 8   | Historial                           | ¿Aparece en Notificaciones admin?                        | No: historial de expensa vive en el consorcio               |

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
- Guardar resultado **por persona** para reintentar solo fallidos.
- Mismo tipo de selector de destinatarios que el comentario.
- Template de mail **nuevo** (no romper el de notificaciones).
- En modo demo el botón no se muestra (ya está).
- Plan por fases: datos → envío → upload → API → dialog → pantalla de estado.

---

## Cambios concretos que deberían hacerse al SPEC/PLAN

Cuando apruebes las decisiones de arriba, actualizar docs así:

1. Flujo = devolver id + envío en background + pantalla que actualiza sola. _(pendiente C1)_
2. Tablas = opción A (nuevas), sin mezclar con `email_log`. _(pendiente C2)_
3. ✅ Al menos 1 PDF _(C3 cerrado)_. Pendiente: máximo 5 + suma ≤ ~25 MB _(C5)_.
4. ✅ Variable `EMAIL_OVERRIDE_TO` _(C4 cerrado)_.
5. Documentar bucket privado + subida por servidor + duración de links. _(pendiente C6)_
6. Fijar asunto final y ruta `/envios/`.
7. Decidir retención de PDFs (90 días o mientras exista el envío).

---

## Orden sugerido para decidir (reunión corta)

1. C1 — ¿Background + pantalla de estado? (sí/no)
2. C2 — ¿Tablas nuevas? (sí → A)
3. ~~C3 +~~ C5 — topes de cantidad/tamaño de PDFs _(C3 ya cerrado: ≥1)_
4. ~~C4 — corregir nombre de env~~ ✅
5. C6 — subida por servidor + bucket privado
6. Asunto del mail + URL `/envios/`
