'use server';
import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { createSession, destroySession } from '@/lib/auth';
import { sendWhatsapp } from '@/lib/notify';

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
  const r = await sendWhatsapp(phone, `Tu código de Registro Citas es ${code}. Vence en 10 minutos. No lo compartas.`);
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
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await bcrypt.compare(String(fd.get('password') || ''), user.passwordHash))) return { error: 'Correo o contraseña incorrectos.' };
  await createSession(user.id);
  redirect(safeNext(fd.get('next')));
}

export async function registerEmail(_: unknown, fd: FormData) {
  const email = String(fd.get('email') || '').toLowerCase().trim();
  const password = String(fd.get('password') || ''); const name = String(fd.get('name') || '').trim();
  const phone = cleanPhone(String(fd.get('phone') || ''));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: 'Completa nombre y un correo válido.' };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  if (await db.user.findUnique({ where: { email } })) return { error: 'Ya existe una cuenta con ese correo.' };
  if (phone && await db.user.findUnique({ where: { phone } })) return { error: 'Ese celular ya está registrado. Ingresa con tu celular.' };
  const user = await db.user.create({ data: { name, email, phone: phone || null, passwordHash: await bcrypt.hash(password, 10) } });
  await createSession(user.id);
  redirect(safeNext(fd.get('next')));
}

export async function logout() { await destroySession(); redirect('/'); }
