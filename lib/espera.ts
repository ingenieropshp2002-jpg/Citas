// Lista de espera de horarios apartados: cuando se liberan, se avisa a quienes tocaron "Avísame si se libera".
import { db } from './db';
import { pushToBusiness, pushToUsers } from './push';
import { sendWhatsapp, waReady } from './notify';
import { fechaCorta, hm, time12, ymd } from './format';

type Freed = { businessId: string; staffId: string; start: Date };

/** Avisa a la lista de espera (y al negocio) que esos horarios quedaron libres. Nunca hace fallar a quien lo llama. */
export async function notifyFreed(list: Freed[], why: string | null = 'Horario liberado') {
  for (const a of list) {
    try {
      const [b, st, watches] = await Promise.all([
        db.business.findUnique({ where: { id: a.businessId }, select: { name: true, slug: true, waPhoneId: true } }),
        db.staff.findUnique({ where: { id: a.staffId }, select: { name: true } }),
        db.slotWatch.findMany({ where: { staffId: a.staffId, start: a.start, notifiedAt: null } })
      ]);
      if (!b) continue;
      const when = `${fechaCorta(a.start)} a las ${time12(hm(a.start))}`;
      const first = st?.name.split(' ')[0] || '';
      for (const w of watches) {
        const svc = (() => { try { return (JSON.parse(w.serviceIds) as string[])[0]; } catch { return undefined; } })();
        const url = `/reservar/${b.slug}?profesional=${a.staffId}&fecha=${ymd(a.start)}${svc ? `&servicio=${svc}` : ''}`;
        await pushToUsers([w.userId], { title: '🔔 ¡Se liberó el horario!', body: `${when} con ${first} en ${b.name}. Resérvalo antes que otra persona.`, url, tag: `libre-${a.staffId}-${a.start.getTime()}` });
        if ((await waReady())) {
          const u = await db.user.findUnique({ where: { id: w.userId }, select: { phone: true, name: true } });
          if (u?.phone) await sendWhatsapp(u.phone, `🔔 ${u.name.split(' ')[0]}, se liberó el horario que esperabas: ${when} con ${first} en ${b.name}. Resérvalo aquí antes que otra persona: ${(process.env.APP_URL || '').replace(/\/$/, '')}${url}`, { phoneId: b.waPhoneId });
        }
      }
      const waiting = await notifyWaitlist(a, b, first);
      if (watches.length) await db.slotWatch.updateMany({ where: { id: { in: watches.map(w => w.id) } }, data: { notifiedAt: new Date() } });
      if (why) await pushToBusiness(a.businessId, { title: `🟢 ${why}`, body: `${when} con ${first} quedó libre${watches.length ? `. Avisamos a ${watches.length} ${watches.length === 1 ? 'persona' : 'personas'} en espera.` : waiting ? `. Avisamos a ${waiting} de la lista de espera.` : '.'}`, url: '/admin/agenda', tag: `libre-${a.staffId}-${a.start.getTime()}` });
    } catch (e) { console.error('notifyFreed', e); }
  }
}

// ───── Lista de espera por fecha y franja ─────
export const WINDOWS = { CUALQUIERA: 'A cualquier hora', MANANA: 'En la mañana', TARDE: 'En la tarde', NOCHE: 'En la noche' } as const;
export type WaitWindow = keyof typeof WINDOWS;
export function inWindow(w: string, hhmm: string) {
  if (w === 'MANANA') return hhmm < '12:00';
  if (w === 'TARDE') return hhmm >= '12:00' && hhmm < '18:00';
  if (w === 'NOCHE') return hhmm >= '18:00';
  return true;
}
/** Cuántos avisos por cupo liberado: a los primeros de la fila; si nadie lo toma, el siguiente cupo avisa a los que siguen. */
const PER_SLOT = 3;
const RENOTIFY_MS = 45 * 60_000;

/** Avisa a la lista de espera que les sirve ese cupo (mismo día, franja y profesional, o cualquiera). Devuelve a cuántos avisó. */
async function notifyWaitlist(a: Freed, b: { name: string; slug: string; waPhoneId: string | null }, staffFirst: string) {
  const day = ymd(a.start); const t = hm(a.start);
  const list = (await db.waitEntry.findMany({
    where: { businessId: a.businessId, status: 'ACTIVA', dateFrom: { lte: day }, dateTo: { gte: day }, OR: [{ staffId: null }, { staffId: a.staffId }], AND: [{ OR: [{ notifiedAt: null }, { notifiedAt: { lt: new Date(Date.now() - RENOTIFY_MS) } }] }] },
    include: { user: { select: { name: true, phone: true } } }, orderBy: [{ notifyCount: 'asc' }, { createdAt: 'asc' }], take: 20
  })).filter(w => inWindow(w.window, t)).slice(0, PER_SLOT);
  if (!list.length) return 0;
  const when = `${fechaCorta(a.start)} a las ${time12(t)}`;
  const wa = await waReady();
  for (const w of list) {
    const svc = (() => { try { return (JSON.parse(w.serviceIds) as string[]).join(','); } catch { return ''; } })();
    const url = `/reservar/${b.slug}?profesional=${a.staffId}&fecha=${day}${svc ? `&servicio=${svc.split(',')[0]}` : ''}`;
    await pushToUsers([w.userId], { title: '🔔 Se liberó un cupo para ti', body: `${when} con ${staffFirst} en ${b.name}. Estabas en la lista de espera: resérvalo antes que otra persona.`, url, tag: `espera-${w.id}` });
    const phone = w.phone || w.user.phone;
    if (wa && phone) await sendWhatsapp(phone, `🔔 ${w.user.name.split(' ')[0]}, se liberó un cupo en ${b.name}: ${when} con ${staffFirst}. Estabas en la lista de espera; resérvalo aquí antes que otra persona: ${(process.env.APP_URL || '').replace(/\/$/, '')}${url}`, { phoneId: b.waPhoneId, businessId: a.businessId, template: { kind: 'CUPO_LIBRE', params: [w.user.name.split(' ')[0], b.name, `${when} con ${staffFirst}`, `${(process.env.APP_URL || '').replace(/\/$/, '')}${url}`] } });
  }
  await db.waitEntry.updateMany({ where: { id: { in: list.map(w => w.id) } }, data: { notifiedAt: new Date(), notifyCount: { increment: 1 } } });
  return list.length;
}

/** Vence las entradas cuyo rango de fechas ya pasó (lo llama el cron). */
export async function expireWaitlist() {
  const r = await db.waitEntry.updateMany({ where: { status: 'ACTIVA', dateTo: { lt: ymd(new Date()) } }, data: { status: 'VENCIDA' } });
  return r.count;
}
