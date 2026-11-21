// Ingreso con Apple (Sign in with Apple, web). Necesita en el entorno:
// APPLE_CLIENT_ID (Services ID), APPLE_TEAM_ID, APPLE_KEY_ID y APPLE_PRIVATE_KEY (contenido del archivo .p8).
import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from 'jose';

export const appleConfigured = () => !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
export const APPLE_REDIRECT = () => `${appUrl()}/api/auth/apple/callback`;
const stateKey = () => new TextEncoder().encode(`${process.env.AUTH_SECRET || 'dev-secret-change-me'}:apple`);

/** Estado firmado (Apple responde con un POST desde su dominio, así que no se puede depender de una cookie). */
export async function appleState(next: string) {
  return new SignJWT({ next }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('10m').sign(stateKey());
}
export async function readAppleState(t: string) {
  try { const { payload } = await jwtVerify(t, stateKey()); const n = String(payload.next || '/'); return n.startsWith('/') && !n.startsWith('//') ? n : '/'; } catch { return null; }
}

async function clientSecret() {
  const key = await importPKCS8(process.env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n').trim(), 'ES256');
  return new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID! })
    .setIssuer(process.env.APPLE_TEAM_ID!).setSubject(process.env.APPLE_CLIENT_ID!).setAudience('https://appleid.apple.com')
    .setIssuedAt().setExpirationTime('5m').sign(key);
}

const jwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
/** Cambia el código por la identidad verificada de Apple. */
export async function appleIdentity(code: string) {
  const r = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.APPLE_CLIENT_ID!, client_secret: await clientSecret(), code, grant_type: 'authorization_code', redirect_uri: APPLE_REDIRECT() })
  }).then(x => x.json()) as { id_token?: string };
  if (!r.id_token) return null;
  const { payload } = await jwtVerify(r.id_token, jwks, { issuer: 'https://appleid.apple.com', audience: process.env.APPLE_CLIENT_ID! });
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  return { sub: String(payload.sub), email: verified && payload.email ? String(payload.email).toLowerCase() : null };
}
