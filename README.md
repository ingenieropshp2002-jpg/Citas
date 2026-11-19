# Registro Citas

Aplicación web para agendar citas en peluquerías, barberías y spas de Colombia, con panel del negocio, caja POS, inventario y facturación electrónica preparada para la DIAN. La interfaz sigue el diseño de Google Stitch (`design/DESIGN.md`): Playfair Display + Manrope, azul petróleo y dorado, modo claro y oscuro.

**Stack:** Next.js 15 (App Router, Server Actions), React 19, Tailwind CSS, Prisma (SQLite en local, PostgreSQL en producción).

## Cómo correrla en tu computador (Windows, Mac o Linux)

Requisito: [Node.js 20 o superior](https://nodejs.org).

```bash
npm install
copy .env.example .env      # en Mac/Linux: cp .env.example .env
npm run setup               # crea las tablas en su PostgreSQL (DATABASE_URL) y carga datos de demostración
npm run dev                 # abre http://localhost:3000
```

Cuentas de demostración (clave `demo1234`):

| Rol | Correo |
|---|---|
| Dueño del negocio (panel completo) | dueno@demo.co |
| Cliente | cliente@demo.co |
| Estilista con permisos limitados | valentina@demo.co |

El ingreso por celular funciona sin configurar nada: mientras no haya WhatsApp configurado, el código aparece en pantalla (solo en desarrollo).

Pruebas automáticas: `npm test` (incluye la verificación del CUFE contra el ejemplo oficial del anexo técnico de la DIAN).

## Qué incluye

**Cliente:** inicio y buscador (nombre, servicio, ciudad; filtros por categoría, precio, calificación y distancia), perfil del negocio (galería, servicios, equipo, reseñas, mapa, horario), reserva en 4 pasos con depósito y pago (Nequi, PSE, tarjeta o en el local), cupones, confirmación con Google Calendar/.ics y WhatsApp, mis citas (reprogramar, cancelar según política, repetir, reseñar), login por celular, correo o Google.

**Panel del negocio:** dashboard, agenda día/semana/mes por profesional (arrastrar para mover, bloquear horarios, colores por estado), clientes (ficha, historial, notas, etiquetas, gasto), servicios (IVA, profesionales, consumo de insumos), equipo (horario, días libres, comisión, permisos y acceso), caja/POS, inventario, facturación DIAN, marketing (campañas por WhatsApp, cupones, recordatorios, clientes inactivos), reportes (CSV) y configuración (link y QR para Instagram/WhatsApp, horarios, política de cancelación y depósito, notificaciones, plan).

**Caja / POS:** apertura y cierre con arqueo, cobro de citas o venta libre, lector de código de barras, varios medios de pago y pago dividido, propina (fuera de la base de IVA), descuentos y cupones, comisiones por profesional, anulación con nota crédito y devolución al inventario, tiquete imprimible de 80 mm con CUFE/CUDE y QR.

**Inventario:** productos de venta e insumos, kárdex con costo promedio ponderado, entradas por proveedor, salidas, ajustes por conteo físico, descuento automático por venta y por servicio realizado, alertas de stock bajo.

## Facturación electrónica DIAN

Lo que hace el software:

- Decide el documento: **documento equivalente electrónico POS** (tipo 20) hasta 5 UVT, y **factura electrónica de venta** (tipo 01) por encima de 5 UVT o cuando el cliente la pide. UVT 2026 = $52.374 (configurable).
- Calcula el **CUFE/CUDE** (SHA-384) en el orden del anexo técnico, genera el **XML UBL 2.1** con extensiones DIAN y el **QR** de consulta.
- Controla las **resoluciones de numeración** (prefijo, rango, vigencia, clave técnica) y avisa cuando se agotan o vencen.
- Emite **notas crédito / notas de ajuste** para anular, maneja **contingencia** (reintento) y descarga del XML.

Lo que **no** hace por sí solo: firmar digitalmente (XAdES-EPES) ni transmitir a la DIAN. Eso lo hace un **proveedor tecnológico autorizado**. El conector está en `lib/dian/provider.ts` (API REST genérica): configure URL, token, ID y PIN del software en *Panel > Facturación DIAN > Proveedor tecnológico* y ajuste el mapeo según la documentación de su proveedor.

**Mientras el proveedor esté en "Simulado", los documentos no tienen validez fiscal.** Para cumplir de verdad:

1. RUT con la responsabilidad 52 (facturador electrónico) y el régimen de IVA correcto.
2. Contratar un proveedor tecnológico autorizado (o usar la solución gratuita de la DIAN).
3. Habilitarse en el portal de la DIAN y superar el set de pruebas (TestSetId), para factura y para documento equivalente POS.
4. Solicitar la numeración (formulario 1876) y registrarla en el panel.
5. Cambiar el ambiente a Producción solo cuando la DIAN lo haya habilitado.

Valide los requisitos vigentes con su contador y en dian.gov.co (Resolución 000165 de 2023 y anexos técnicos).

## Pagos (pasarela)

En `.env` elija `PAYMENT_PROVIDER`:

- `SIMULADO` (por defecto): una pantalla de prueba aprueba o rechaza el pago.
- `WOMPI` (Bancolombia: tarjeta, PSE, Nequi): `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, `WOMPI_ENV`. Configure en Wompi la URL de eventos `https://SU-DOMINIO/api/pagos/webhook`.
- `MERCADOPAGO`: `MERCADOPAGO_ACCESS_TOKEN`. Use la misma URL de webhook.

El estado del pago siempre se verifica con la pasarela (webhook firmado o consulta), no con los parámetros de retorno.

## WhatsApp, recordatorios y reservas por WhatsApp

Sin claves, todo funciona en modo simulado (los mensajes se registran en los logs). Para enviarlos de verdad:

1. Cree una app en [Meta for Developers](https://developers.facebook.com) con el producto WhatsApp y un número de WhatsApp Business.
2. Agregue en Cloudflare los secretos `WHATSAPP_TOKEN` (token permanente de usuario del sistema) y `WHATSAPP_PHONE_ID`.
3. En Meta > WhatsApp > Configuración, ponga el webhook `https://SU-DOMINIO/api/whatsapp/webhook`, el token de verificación `WHATSAPP_VERIFY_TOKEN` y suscriba `messages`. Agregue `WHATSAPP_APP_SECRET` para validar la firma.
4. Programe `GET /api/cron/recordatorios` cada 15 minutos con `Authorization: Bearer <CRON_SECRET>`.

Qué hace: confirmación al reservar, recordatorio con "responde 1 para confirmar o 2 para reprogramar", respuesta automática con el enlace de reserva cuando un cliente escribe para pedir cita, saludo de cumpleaños y mensajes para clientes inactivos. Fuera de la ventana de 24 h Meta exige plantillas aprobadas: créelas y ponga sus nombres en `WHATSAPP_TPL_*`.

## Fidelización, gastos, academia y suscripciones

- **Fidelización** (`/admin/fidelizacion`): puntos por cada $1.000 cobrados en caja, premios y canjes, cumpleaños del mes y clientes inactivos.
- **Gastos** (`/admin/gastos`): registro de gastos por categoría y utilidad del mes (ingresos − gastos). También aparece en Reportes.
- **QR para la próxima cita**: el recibo de caja trae un QR de reserva y `/admin/qr` imprime un afiche para recepción.
- **Academia** (`/admin/academia`): cursos cortos para dueños y profesionales, con progreso por usuario.
- **Prueba gratis**: cada negocio nuevo tiene 14 días del plan Pro sin tarjeta. Al vencer, el panel solo muestra `/admin/suscripcion` (la página pública de reservas sigue funcionando). Los correos en `ADMIN_EMAILS` no tienen bloqueo y ven `/admin/superadmin` para activar o extender negocios.
- **Base de datos**: si ya tenía el esquema, aplique `prisma/migraciones/2026-11-14_fidelizacion_gastos_suscripcion.sql` (con `SET search_path TO citas;`).

## Desplegar en producción (Supabase + Cloudflare Workers)

La base vive en Supabase (PostgreSQL), en el esquema `citas`, y la app corre en Cloudflare Workers con OpenNext.

1. **Base de datos:** ejecute `prisma/citas.sql` en el SQL Editor de Supabase (crea el esquema `citas` y sus tablas). Si cambia el modelo, regenere ese archivo con `npm run db:sql`.
2. **Datos iniciales (opcional):** `DATABASE_URL=... SEED_PASSWORD=una-clave-segura npm run db:seed`. El seed se niega a correr si la base ya tiene datos, salvo que use `SEED_RESET=1` (eso BORRA todo).
3. **Secretos en Cloudflare:** `npx wrangler secret put DATABASE_URL` (URI del *Transaction pooler* de Supabase, puerto 6543), `AUTH_SECRET` (aleatorio y largo), `APP_URL` (su dominio), y los de pagos, WhatsApp, Google y `CRON_SECRET` que use. `DB_SCHEMA=citas` ya está en `wrangler.jsonc`.
4. **Publicar:** `npx wrangler login` y luego `npm run deploy`. También puede conectar el repositorio en Cloudflare > Workers & Pages > Create > Import a repository, dejando los comandos por defecto (`npm run build` y `npx wrangler deploy`).
5. **Probar localmente como en Cloudflare:** cree `.dev.vars` con las mismas variables y ejecute `npm run preview`.
6. **Recordatorios:** programe una llamada cada 15 minutos a `GET /api/cron/recordatorios` con `Authorization: Bearer <CRON_SECRET>` (cron-job.org o pg_cron de Supabase).
7. **Login con Google:** URL de retorno `https://SU-DOMINIO/api/auth/google/callback`.

Para desarrollo local necesita un PostgreSQL (por ejemplo un proyecto gratuito de Supabase o Postgres en Docker) en `DATABASE_URL`.

## Estructura

```
app/(cliente)/   páginas públicas y del cliente
app/admin/       panel del negocio (_actions = lógica del servidor)
app/api/         disponibilidad, pagos, cron, XML, reportes, Google
lib/dian/        CUFE/CUDE, XML UBL, emisión y conector del proveedor
lib/             disponibilidad, inventario, impuestos, pagos, notificaciones
prisma/          modelo de datos y datos de demostración
design/          tokens y DESIGN.md de Stitch
```
