# QA — Enviar expensa mensual

Guía para **probar el feature a mano** (o con checklist) cuando esté implementado.

Antes de firmar el MVP: leer el SPEC y la [revisión crítica](./ADVERSARIAL-REVIEW.md). **C1–C6 y menores están cerrados** (2026-07-21).

---

## Qué probamos / qué no

**Sí entra en QA del MVP**

- El dialog “Enviar expensa mensual”
- Elegir destinatarios, comentario, link, PDFs (1–3 × ≤5 MB), contador, preview (mismo template)
- Que los mails lleguen con asunto `Expensa Mensual`, saludo `Vecino/a` y los PDFs
- Pantalla de estado en `/consorcios/[id]/envios/[envioId]` y **Reintentar pendientes**
- Historial de expensas **dentro del consorcio**
- Que al responder el mail vaya al email del consorcio (Reply-To)
- Modo de prueba con override (todos los mails a tu inbox)
- Que no se rompan “Enviar comentario” ni Notificaciones
- Que un doble click no cree dos envíos

**No falla el MVP si falta**

- Asunto editable, PDF distinto por persona, jobs tipo Inngest, webhooks de “entregado”, From = Gmail del consorcio, Cloudflare R2, dominio ya verificado en Resend

---

## Antes de empezar a probar

Prepará esto:

1. `RESEND_API_KEY` válido
2. `EMAIL_FROM` configurado
3. `EMAIL_OVERRIDE_TO` = **tu** mail de prueba (obligatorio mientras el dominio no esté verificado)
4. Demo mode **apagado** (`NEXT_PUBLIC_DEMO_MODE` no en `true`) — si no, no ves el botón
5. Bucket de Storage **privado** listo (retención 60 días documentada)
6. Un consorcio de prueba con:
   - al menos 3 emails de inquilinos activos
   - preferible uno **con** email de facturación y otro **sin**
   - preferible con link de Drive cargado
7. Confirmar que “Enviar comentario” y Notificaciones andan **antes** de tocar este feature (línea base)

---

## Criterios de aceptación

Cada ítem es un “sí/no”. Los IDs (`AC-01`…) sirven para anotar en PRs o en el sign-off.

### Dialog y formulario

| ID    | ¿Qué tiene que pasar?                                                                                                                  |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | El botón **Enviar expensa mensual** abre el dialog (ya no es un botón vacío).                                                          |
| AC-02 | Con demo mode activo, ese botón **no** aparece.                                                                                        |
| AC-03 | El selector de destinatarios se comporta igual que en “Enviar comentario” (uno / varios / todos) y solo lista emails de ese consorcio. |
| AC-04 | Se ve un texto tipo “Se enviará a N personas” acorde a la selección.                                                                   |
| AC-05 | Sin comentario no se puede enviar (botón deshabilitado o error en español).                                                            |
| AC-06 | Si el consorcio tiene link de Drive, el campo link viene precargado y se puede editar.                                                 |
| AC-07 | Se puede borrar el link y igual enviar; el mail no muestra el botón/enlace.                                                            |
| AC-08 | Un link inválido (texto que no es URL) muestra error y no envía.                                                                       |
| AC-09 | Un archivo que no es PDF se rechaza con mensaje claro.                                                                                 |
| AC-10 | Un PDF de más de 5 MB se rechaza.                                                                                                      |
| AC-11 | Más de **3** PDFs se rechaza (cliente y servidor).                                                                                     |
| AC-12 | **≥1 PDF obligatorio:** sin PDF no envía (CTA disabled + rechazo server).                                                              |
| AC-13 | El preview usa el **mismo template** que el mail real (comentario, link si hay, nombres de PDFs, saludo `Vecino/a`).                   |
| AC-14 | El asunto del mail es **`Expensa Mensual`** (no hay campo asunto en la UI).                                                            |
| AC-15 | Mientras sube o envía, el botón no se puede spamear; doble pulsación **no** crea dos envíos.                                           |

### Correo (Resend)

| ID    | ¿Qué tiene que pasar?                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-16 | El remitente (`From`) es `EMAIL_FROM`.                                                                                                                |
| AC-17 | Si el consorcio tiene email de facturación, el mail tiene **Reply-To** a ese email (al responder, llega ahí).                                         |
| AC-18 | Si no tiene email de facturación, el envío igual funciona y simplemente no lleva Reply-To.                                                            |
| AC-19 | Con override activo: todos los mails llegan a tu inbox de prueba; el asunto indica a quién iba en realidad (`[para: …]`).                             |
| AC-20 | Todos reciben **los mismos** PDFs; se abren; nombres correctos.                                                                                       |
| AC-21 | Este feature no usa el envío “batch” sin adjuntos; manda de a uno con PDF. _(Lo verifica quien implementa / logs; QA funcional: los adjuntos están.)_ |
| AC-22 | El saludo del mail es **`Vecino/a`** (no nombre personal ni unidad).                                                                                  |

### Guardado, pantalla de estado, reintentos

| ID    | ¿Qué tiene que pasar?                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-23 | Al enviar, se crea un registro del envío + una fila por persona; la app te lleva **de inmediato** a la pantalla de estado (no espera el fan-out). |
| AC-24 | Esa pantalla está en `/consorcios/[id]/envios/[envioId]` y muestra resumen (enviados / fallidos / pendientes / total) + tabla por destinatario.   |
| AC-25 | Mientras está enviando, la pantalla se actualiza sola (sin F5).                                                                                   |
| AC-26 | El estado final (`enviado` / `parcial` / `fallido`) coincide con lo que pasó en la tabla.                                                         |
| AC-27 | Si copiás la URL del envío y recargás, ves lo mismo.                                                                                              |
| AC-28 | En el **consorcio** se ve un historial reciente de expensas (fecha, estado, cantidades, quién envió); **no** en Notificaciones admin.             |
| AC-29 | **Reintentar pendientes** solo reintenta `pending`/`failed`; los que ya estaban `sent` **no** reciben otro mail.                                  |
| AC-30 | El reintento usa los mismos PDFs, comentario, link y asunto (no hace falta volver a subir archivos).                                              |
| AC-31 | Si el envío se corta a mitad, la UI **no** dice “todo enviado”; se pueden reintentar pendientes.                                                  |

### Permisos y seguridad

| ID    | ¿Qué tiene que pasar?                                                         |
| ----- | ----------------------------------------------------------------------------- |
| AC-32 | Un usuario sin acceso a ese consorcio no puede enviar ni ver/bajar esos PDFs. |
| AC-33 | No se puede mandar a un email que no esté en la lista del consorcio.          |
| AC-34 | No se puede “enganchar” un PDF de otro consorcio/usuario en el envío.         |

### Que no se rompa lo anterior

| ID    | ¿Qué tiene que pasar?                                                 |
| ----- | --------------------------------------------------------------------- |
| AC-35 | “Enviar comentario” sigue funcionando como antes.                     |
| AC-36 | La pantalla de Notificaciones (admin) sigue funcionando.              |
| AC-37 | El template viejo de notificaciones/comentarios no cambió de aspecto. |

### Detalles de producto / código

| ID    | ¿Qué tiene que pasar?                                                          |
| ----- | ------------------------------------------------------------------------------ |
| AC-38 | Textos de UI, errores y toasts en **español**; rutas en español (`/envios/`).  |
| AC-39 | No aparece scroll horizontal feo en dialog ni en estado (cel/desktop).         |
| AC-40 | Los campos del form usan los wrappers de `src/components/form/`.               |
| AC-41 | La tabla de destinatarios en estado usa `DataTable`.                           |
| AC-42 | Se ve alineado al diseño del resto de la app (no blanco puro, acento primary). |

---

## Guiones de prueba (paso a paso)

### Camino feliz

1. Entrá con un usuario que administre el consorcio de prueba.
2. Confirmá que el override apunta a tu mail.
3. Abrí el dialog → elegí todos → escribí comentario → adjuntá 1 o 2 PDFs chicos → mirá el preview (saludo `Vecino/a`) → Enviar.
4. Deberías ir **al toque** a `/consorcios/…/envios/…` y terminar en “enviado” (progreso se actualiza solo).
5. En tu inbox: un mail por destinatario, asunto `Expensa Mensual` (con `[para: …]` si override), PDFs abribles, Reply-To = email del consorcio, link en el cuerpo si lo pusiste.
6. El historial **del consorcio** muestra este envío.

Cubre sobre todo: AC-01, 04, 06, 13–17, 19–28, 38.

### Validaciones (cosas que deben fallar bien)

| Probá esto                   | Resultado esperado |
| ---------------------------- | ------------------ |
| Ningún destinatario          | No envía           |
| Comentario vacío             | No envía           |
| Archivo .png / .docx         | Rechazo claro      |
| PDF > 5 MB                   | Rechazo claro      |
| 4 PDFs                       | Rechazo claro      |
| 0 PDFs                       | No envía (AC-12)   |
| Link inventado (“hola”)      | Error de URL       |
| Doble click rápido en Enviar | Un solo envío      |

### Fallo parcial + reintento

1. Forzá que falle al menos un destinatario (en staging: mock, o un caso controlado).
2. El estado debe quedar “parcial”; esa fila en failed con algún error legible.
3. Apretá **Reintentar pendientes**.
4. Esa persona pasa a enviado; las que ya estaban bien **no** reciben un segundo mail.
5. Los contadores cuadran.

### Override

- Con override: todo llega a tu casilla; N copias; asunto `Expensa Mensual` + `[para: email real]`.
- Sin override solo tiene sentido cuando el dominio de Resend ya esté verificado (no lo uses en sandbox típico).

### Reply-To

- Con email de facturación: mirá el mail en Resend o “mostrar original” → Reply-To correcto.
- Sin email de facturación: envío OK, sin ese header.

### Preview

- Cambiá comentario / link / nombres de PDF → el preview se actualiza y coincide con el mail que llega (mismo template; saludo `Vecino/a`).

### Historial

- Hacé un segundo envío → la lista **en el consorcio** muestra ambos; al abrir uno volvés a la vista de estado.
- Confirmá que **no** aparece en Notificaciones admin.

### Regresión rápida

- Enviar un comentario (varios modos de destinatarios).
- Mandar una notificación admin.
- Confirmar que eso no se rompió.

---

## Casos borde

| Situación                               | Esperado                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| Consorcio sin email de facturación      | Envía OK; sin Reply-To                                                             |
| Consorcio sin Drive                     | Campo link vacío; se puede enviar sin link                                         |
| Sin ningún PDF                          | No envía (AC-12)                                                                   |
| 3 PDFs de ~5 MB                         | Acepta; 4.º se rechaza                                                             |
| Un solo destinatario                    | Contador 1; un mail; estado enviado                                                |
| ~50 destinatarios                       | Termina o se puede recuperar con Reintentar pendientes; no deja datos incoherentes |
| Corte a mitad de envío                  | No marca todo como enviado; se pueden reintentar pendientes                        |
| Subís PDFs y cancelás el dialog         | No se crea envío; pueden quedar archivos huérfanos (aceptable si está documentado) |
| Inquilino borrado (soft delete)         | No aparece en el selector                                                          |
| Spam al botón reintentar / enviar       | No duplica mails de más; botón deshabilitado mientras corre                        |
| Nombre de PDF raro (acentos, muy largo) | No rompe el mail                                                                   |

---

## Checklist de calidad (no funcional)

- [ ] Sin scroll horizontal raro
- [ ] Copy 100% en español
- [ ] Forms con wrappers del proyecto
- [ ] Tabla de estado con `DataTable`
- [ ] Datos remotos con TanStack Query (no `useEffect` + `useState` inventado)
- [ ] Solo pnpm
- [ ] Código/DB en inglés; URLs en español (`/consorcios/[id]/envios/[envioId]`)

---

## Firma del MVP

**Decisiones / docs**

- [x] SPEC: C1, C2, C3, C4, C5, C6 y menores aplicados (2026-07-21)
- [ ] Bucket y variables de entorno documentados en esta carpeta

**Funcional**

- [ ] AC-01 a AC-34 OK (o waiver escrito abajo)
- [ ] Camino feliz con override + PDF real
- [ ] Parcial + **Reintentar pendientes** verificado
- [ ] Reply-To verificado en al menos un mail
- [ ] Recuperación si se corta el envío

**Regresión**

- [ ] AC-35 a AC-37 OK

**Calidad**

- [ ] AC-38 a AC-42 OK
- [ ] Tests unitarios del armado del mail en verde
- [ ] Sin secretos en logs del browser

| Rol               | Nombre | Fecha | OK  |
| ----------------- | ------ | ----- | --- |
| Quien implementó  |        |       | ☐   |
| Quien revisó / QA |        |       | ☐   |

Notas o excepciones (waivers):

```
(escribir acá)
```

---

## Mapa rápido SPEC → tests

| Parte del SPEC     | Criterios        |
| ------------------ | ---------------- |
| UX del dialog      | AC-01–15, 38–42  |
| Contenido del mail | AC-13–14, 16–22  |
| Datos y envío      | AC-23–31         |
| Archivos           | AC-09–12, 30, 34 |
| Permisos           | AC-32–34         |
| Regresión          | AC-35–37         |
| Override           | AC-19            |
