// Lista de espera de horarios apartados: cuando se liberan, se avisa a quienes tocaron "Avísame si se libera".
import { db } from './db';
import { pushToBusiness, pushToUsers } from './push';
import { sendWhatsapp, waConfigured } from './notify';
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
        if (waConfigured()) {
          const u = await db.user.findUnique({ where: { id: w.userId }, select: { phone: true, name: true } });
          if (u?.phone) await sendWhatsapp(u.phone, `🔔 ${u.name.split(' ')[0]}, se liberó el horario que esperabas: ${when} con ${first} en ${b.name}. Resérvalo aquí antes que otra persona: ${(process.env.APP_URL || '').replace(/\/$/, '')}${url}`, { phoneId: b.waPhoneId });
        }
      }
      if (watches.length) await db.slotWatch.updateMany({ where: { id: { in: watches.map(w => w.id) } }, data: { notifiedAt: new Date() } });
      if (why) await pushToBusiness(a.businessId, { title: `🟢 ${why}`, body: `${when} con ${first} quedó libre${watches.length ? `. Avisamos a ${watches.length} ${watches.length === 1 ? 'persona' : 'personas'} en espera.` : '.'}`, url: '/panel/agenda', tag: `libre-${a.staffId}-${a.start.getTime()}` });
    } catch (e) { console.error('notifyFreed', e); }
  }
}
