'use server';
import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';
import { sendWhatsapp } from '@/lib/notify';
import { emailConfigured, readResetToken, resetLink, sendEmail } from '@/lib/reset';
import { getSettings } from '@/lib/settings';

const h = (s: string) => createHash('sha256').update(s + (process.env.AUTH_SECRET || '')).digest('hex');
const cleanPhone = (p: string) => p.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
const safeNext = (n: unknown) => { const s = String(n || '/'); return s.startsWith('/') && !s.startsWith('//') ? s : '/'; };

export async function sendOtp(phoneRaw: string) {
  const phone = cleanPhone(phoneRaw);
  if (!/^3\d{9}$/.test(phone)) return { error: 'Ingresa un celular colombiano válido (10 dígitos, empieza por 3).' };
  const recent = await db.otpCode.count({ where: { phone, createdAt: { gt: new Date(Date.now() - 10 * 60000) } } });
  if (recent >= 5) return { error: 'Demasiados intentos. Espera unos minutos.' };
  const code = String(randomInt(100000, 999999));
  await db.otpCode.create({ data: { phone, codeHash: h(code), expiresAt: new Date(Date.now() + 10 * 60000) } });
  const r = await sendWhatsapp(phone, `Tu código de ${(await getSettings()).appName} es ${code}. Vence en 10 minutos. No lo compartas.`);
  return { ok: true, devCode: r.simulated && process.env.NODE_ENV !== 'production' ? code : undefined };
}

export async function verifyOtp(phoneRaw: string, code: string, name: string, next: string) {
  const phone = cleanPhone(phoneRaw);
  const otp = await db.otpCode.findFirst({ where: { phone, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
  if (!otp || otp.attempts >= 5) return { error: 'El código venció. Solicita uno nuevo.' };
  if (otp.codeHash !== h(code.trim())) { await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } }); return { error: 'Código incorrecto.' }; }
  await db.otpCode.deleteMany({ where: { phone } });
  let user = await db.user.findUnique({ where: { phone } });
  if (!user) { if (!name.trim()) return { needName: true }; user = await db.user.create({ data: { phone, name: name.trim() } }); }
  await createSession(user.id);
  redirect(safeNext(next));
}

export async function loginEmail(_: unknown, fd: FormData) {
  const email = String(fd.get('email') || '').toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Escribe un correo válido.', email };
  const user = await db.user.findUnique({ where: { email } });
  if (user?.blocked) return { error: 'Esta cuenta está suspendida. Escríbenos si crees que es un error.', email };
  if (user && !user.passwordHash) return { error: 'Esta cuenta se creó con Google o con celular. Ingresa por ese medio o crea una contraseña con “¿Olvidaste tu contraseña?”.', email };
  if (!user?.passwordHash || !(await bcrypt.compare(String(fd.get('password') || ''), user.passwordHash))) return { error: 'El correo o la contraseña no coinciden.', email };
  await createSession(user.id);
  redirect(safeNext(fd.get('next')));
}

export async function registerEmail(_: unknown, fd: FormData) {
  const email = String(fd.get('email') || '').toLowerCase().trim();
  const password = String(fd.get('password') || ''); const name = String(fd.get('name') || '').trim();
  const phone = cleanPhone(String(fd.get('phone') || ''));
  const back = { name, email, phone };
  if (name.length < 2) return { error: 'Escribe tu nombre completo.', ...back };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Escribe un correo válido.', ...back };
  if (phone && !/^3\d{9}$/.test(phone)) return { error: 'El celular debe tener 10 dígitos y empezar por 3.', ...back };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.', ...back };
  if (password !== String(fd.get('password2') ?? password)) return { error: 'Las contraseñas no coinciden.', ...back };
  if (await db.user.findUnique({ where: { email } })) return { error: 'Ya hay una cuenta con ese correo. Ingresa o recupera tu contraseña.', ...back };
  if (phone && await db.user.findUnique({ where: { phone } })) return { error: 'Ese celular ya está en otra cuenta. Déjalo vacío o ingresa con esa cuenta.', ...back };
  const user = await db.user.create({ data: { name, email, phone: phone || null, passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(user.id);
  redirect(safeNext(fd.get('next')));
}

export async function requestReset(_: unknown, fd: FormData) {
  const email = String(fd.get('email') || '').toLowerCase().trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Escribe un correo válido.' };
  if (!emailConfigured()) return { manual: true };
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const link = await resetLink(user, safeNext(fd.get('next')));
    const ok = await sendEmail(email, 'Crea tu nueva contraseña', `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0d2538"><h2>Hola, ${user.name.split(' ')[0]}</h2><p>Recibimos una solicitud para cambiar la contraseña de tu cuenta en ${(await getSettings()).appName}.</p><p><a href="${link}" style="display:inline-block;background:#0d2538;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none">Crear nueva contraseña</a></p><p style="color:#555;font-size:13px">El enlace vence en 24 horas. Si no fuiste tú, ignora este mensaje.</p></div>`);
    if (!ok) return { error: 'No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.' };
  }
  return { ok: true };
}

export async function resetPassword(_: unknown, fd: FormData) {
  const data = await readResetToken(String(fd.get('token') || ''));
  if (!data) return { error: 'El enlace venció o ya se usó. Pide uno nuevo.' };
  const password = String(fd.get('password') || '');
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (password !== String(fd.get('password2') || '')) return { error: 'Las contraseñas no coinciden.' };
  await db.user.update({ where: { id: data.user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(data.user.id);
  redirect(safeNext(data.next));
}

export async function logout() { await destroySession(); redirect('/'); }
