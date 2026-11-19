import { NextRequest, NextResponse } from 'next/server';
import { requireBusiness } from '@/lib/auth';
import { db } from '@/lib/db';
import { exchangeCode, seal, staffFromState, syncStaff } from '@/lib/gcal';

export async function GET(req: NextRequest) {
  const { business } = await requireBusiness();
  const sp = req.nextUrl.searchParams;
  const back = new URL('/admin/calendario', req.url);
  const staffId = staffFromState(sp.get('state') || '');
  const code = sp.get('code');
  if (!staffId || !code) { back.searchParams.set('error', sp.get('error') === 'access_denied' ? 'cancelado' : 'invalido'); return NextResponse.redirect(back); }
  const st = await db.staff.findFirst({ where: { id: staffId, businessId: business.id }, select: { id: true } });
  if (!st) { back.searchParams.set('error', 'permiso'); return NextResponse.redirect(back); }
  try {
    const { refresh, email } = await exchangeCode(code);
    await db.staff.update({ where: { id: st.id }, data: { gcalToken: seal(refresh), gcalEmail: email, gcalError: null } });
    await syncStaff(st.id).catch(() => 0);
    back.searchParams.set('ok', '1');
  } catch (e) { back.searchParams.set('error', 'google'); console.error('[gcal]', e); }
  return NextResponse.redirect(back);
}
