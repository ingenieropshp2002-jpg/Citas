import { db } from '@/lib/db';
const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const a = await db.appointment.findUnique({ where: { code: (await params).code }, include: { business: true, staff: true, services: { include: { service: true } } } });
  if (!a) return new Response('No encontrada', { status: 404 });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reservas//ES', 'BEGIN:VEVENT', `UID:${a.code}@registrocitas`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(a.start)}`, `DTEND:${f(a.end)}`,
    `SUMMARY:${a.services.map(s => s.service.name).join(' + ')} - ${a.business.name}`, `LOCATION:${a.business.address}`, `DESCRIPTION:Cita ${a.code} con ${a.staff.name}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Recordatorio de cita', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="cita-${a.code}.ics"` } });
}
