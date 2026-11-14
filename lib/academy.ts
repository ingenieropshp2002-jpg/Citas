// Academia: cursos cortos para dueños y profesionales. El contenido vive en el código para que funcione sin configuración.
export type Lesson = { id: string; title: string; minutes: number; body: string };
export type Course = { id: string; title: string; icon: string; audience: string; lessons: Lesson[] };

export const COURSES: Course[] = [
  { id: 'inicio', title: 'Primeros pasos con la app', icon: 'rocket_launch', audience: 'Dueños y recepción', lessons: [
    { id: 'inicio-1', title: 'Configura tu negocio en 10 minutos', minutes: 5, body: `Antes de compartir tu enlace, deja listo lo básico:
- En Configuración completa nombre, dirección, horarios, fotos y el WhatsApp del negocio.
- Define el depósito para reservar (por ejemplo 30 %) y hasta cuántas horas antes se puede cancelar gratis.
- En Servicios crea cada servicio con su precio, duración y quién lo hace.
- En Equipo agrega a tus profesionales con su horario y su comisión.
Cuando termines, abre "Ver mi página" y haz una reserva de prueba como si fueras cliente.` },
    { id: 'inicio-2', title: 'La agenda del día', minutes: 4, body: `La Agenda muestra una columna por profesional.
- Arrastra una cita para moverla de hora o de profesional.
- Usa "Bloquear horario" para almuerzos, permisos o cursos.
- Cambia el estado: Confirmada, En servicio, Completada o No asistió. Las inasistencias se ven en Reportes.
- Las citas con un ✓ verde ya fueron confirmadas por el cliente respondiendo "1" por WhatsApp.` },
    { id: 'inicio-3', title: 'Cobrar en caja y facturar', minutes: 6, body: `Abre la caja al iniciar el día con la base en efectivo.
- Busca la cita o agrega servicios y productos, elige al cliente (así suma puntos) y cobra con uno o varios medios de pago.
- Si la compra supera 5 UVT o el cliente lo pide con su NIT o cédula, el sistema emite factura electrónica; si no, documento equivalente POS.
- Al final del día cierra la caja y compara el efectivo contado con el esperado.
El recibo trae un código QR para que el cliente agende su próxima cita al salir.` },
    { id: 'inicio-4', title: 'Inventario y gastos', minutes: 5, body: `En Inventario registra las entradas de productos y el sistema descuenta solo lo vendido y los insumos usados en cada servicio.
- Revisa la alerta de stock bajo antes de hacer pedidos.
- En Gastos anota arriendo, servicios, nómina, insumos y publicidad.
- Mira la utilidad del mes: ingresos de caja menos gastos. Si el margen baja, revisa precios o gastos grandes.` }
  ] },
  { id: 'servicio', title: 'Atención que fideliza', icon: 'favorite', audience: 'Profesionales', lessons: [
    { id: 'servicio-1', title: 'Bienvenida y diagnóstico', minutes: 4, body: `Los primeros 2 minutos definen la experiencia.
- Saluda por el nombre y ofrece algo de tomar.
- Pregunta qué quiere lograr y muestra fotos de referencia antes de empezar.
- Revisa las notas del cliente en su ficha: alergias, fórmula de color, preferencias.
- Confirma precio y tiempo antes de iniciar para evitar sorpresas al pagar.` },
    { id: 'servicio-2', title: 'Recomendar sin presionar', minutes: 4, body: `Recomendar es parte del servicio cuando resuelve una necesidad real.
- Recomienda máximo un producto o tratamiento, explicando el beneficio.
- Usa frases como "para que el color te dure más, te sirve…".
- Si el cliente dice que no, no insistas: anótalo en sus preferencias para otra visita.` },
    { id: 'servicio-3', title: 'Cierre y próxima cita', minutes: 3, body: `Antes de que el cliente se vaya:
- Muéstrale el resultado y pregunta si quedó feliz.
- Sugiere cuándo volver (corte cada 4 semanas, uñas cada 2 o 3) y agenda ahí mismo o muéstrale el QR del recibo.
- Recuérdale sus puntos acumulados y qué premio está cerca.
- Pídele una reseña si quedó contento.` },
    { id: 'servicio-4', title: 'Manejo de quejas', minutes: 4, body: `Una queja bien atendida crea clientes leales.
- Escucha sin interrumpir y agradece que lo diga.
- Ofrece una solución concreta: retoque sin costo, descuento o devolución según el caso.
- Registra lo que pasó en las notas del cliente.
- Haz seguimiento por WhatsApp a los dos días.` }
  ] },
  { id: 'crecer', title: 'Haz crecer tu negocio', icon: 'trending_up', audience: 'Dueños', lessons: [
    { id: 'crecer-1', title: 'Precios que sí dejan ganancia', minutes: 6, body: `Calcula el costo real de cada servicio:
- Insumos usados + comisión del profesional + parte de los gastos fijos por hora.
- Si un servicio dura 1 hora y tus gastos fijos son $6.000.000 al mes con 180 horas atendidas, cada hora carga $33.000 de gastos fijos.
- Precio sugerido = costo total ÷ (1 − margen deseado). Con un costo de $50.000 y margen del 40 %, el precio queda en $83.000.
Revisa la página Gastos cada mes para actualizar el cálculo.` },
    { id: 'crecer-2', title: 'Instagram y WhatsApp que llenan la agenda', minutes: 5, body: `Pon tu enlace de reservas en la biografía de Instagram y en el perfil de WhatsApp Business.
- Publica antes y después con el nombre del profesional.
- Usa historias con "quedan 3 cupos para el sábado" y el enlace.
- Responde mensajes con el enlace de reserva en vez de agendar a mano.
- Imprime el afiche QR para recepción.` },
    { id: 'crecer-3', title: 'Puntos, cumpleaños y clientes inactivos', minutes: 5, body: `Retener un cliente cuesta mucho menos que conseguir uno nuevo.
- Activa los puntos: 1 punto por cada $1.000 es fácil de entender.
- Crea 2 o 3 premios alcanzables (por ejemplo, 150 puntos = manicure gratis).
- Deja activo el saludo de cumpleaños con un cupón.
- Cada semana escribe a los clientes inactivos con una invitación personal.` },
    { id: 'crecer-4', title: 'Menos inasistencias', minutes: 4, body: `Cada cita perdida es dinero que no vuelve.
- Cobra un depósito al reservar en línea.
- Deja activo el recordatorio por WhatsApp con confirmación (responder 1 o 2).
- Llama a quien no confirmó la tarde anterior.
- Define y comunica tu política de cancelación.` }
  ] },
  { id: 'dian', title: 'Facturación electrónica sin enredos', icon: 'receipt_long', audience: 'Dueños y contador', lessons: [
    { id: 'dian-1', title: 'POS electrónico o factura electrónica', minutes: 5, body: `En Colombia el tiquete POS de papel ya no sirve: se reemplazó por el documento equivalente electrónico POS (Resolución 165 de 2023).
- Ventas hasta 5 UVT a consumidor final: documento equivalente POS electrónico.
- Ventas mayores o cuando el cliente pide factura con su documento: factura electrónica de venta.
- Ambos llevan CUFE o CUDE y código QR.` },
    { id: 'dian-2', title: 'Habilitación y resolución de numeración', minutes: 6, body: `Para emitir con validez necesitas:
- RUT actualizado con la responsabilidad de facturador electrónico.
- Habilitarte en el portal de la DIAN o por medio de un proveedor tecnológico autorizado.
- Solicitar la resolución de numeración (prefijo y rango) en el servicio informático de la DIAN.
- Registrar la resolución y la clave técnica en Facturación > Configuración.
Mientras no termines este proceso, los documentos salen en ambiente de pruebas y no tienen validez fiscal.` },
    { id: 'dian-3', title: 'Anulaciones y notas crédito', minutes: 4, body: `Un documento electrónico no se borra.
- Si te equivocaste o hubo devolución, anula la venta en Caja: el sistema genera la nota crédito.
- Para un cambio de precio parcial, consulta con tu contador.
- Revisa cada semana en Facturación que no haya documentos rechazados.` }
  ] }
];

export const ALL_LESSONS = COURSES.flatMap(c => c.lessons.map(l => ({ ...l, course: c })));
export function findLesson(id: string) { return ALL_LESSONS.find(l => l.id === id) || null; }
