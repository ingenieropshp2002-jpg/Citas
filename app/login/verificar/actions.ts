'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { bumpPending, finishPending, pendingSignIn } from '@/lib/auth';
import { openSecret, consumeRecovery, verify } from '@/lib/totp';

export async function verifySecondStep(_: unknown, fd: FormData) {
  const p = await pendingSignIn();
  if (!p) return { error: 'El ingreso venció. Vuelve a escribir tu correo y contraseña.', expired: true };
  const u = await db.user.findUnique({ where: { id: p.uid }, select: { totpSecret: true, totpRecovery: true, totpEnabledAt: true } });
  if (!u?.totpEnabledAt || !u.totpSecret) { await finishPending(p.uid); redirect(p.next); }
  const input = String(fd.get('code') || '').trim();
  let ok = /^\d[\d\s]{5,}$/.test(input) && verify(openSecret(u.totpSecret!), input);
  if (!ok && input.replace(/[^A-Za-z0-9]/g, '').length === 8) {
    const left = consumeRecovery(u.totpRecovery, input);
    if (left !== null) { ok = true; await db.user.update({ where: { id: p.uid }, data: { totpRecovery: left } }); }
  }
  if (!ok) {
    const more = await bumpPending(p);
    return more ? { error: 'El código no es correcto. Revisa la hora del celular y escribe el código que se ve ahora.' } : { error: 'Demasiados intentos. Vuelve a ingresar.', expired: true };
  }
  await finishPending(p.uid);
  redirect(p.next);
}
