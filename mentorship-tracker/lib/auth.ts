import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'la_admin';

function secret() {
  return process.env.AUTH_SECRET || 'insecure-development-secret';
}

function sign(value: string) {
  return createHmac('sha256', secret()).update(value).digest('hex');
}

export function makeToken() {
  const issued = String(Date.now());
  return `${issued}.${sign(issued)}`;
}

export function tokenIsValid(token: string | undefined): boolean {
  if (!token) return false;
  const [issued, mac] = token.split('.');
  if (!issued || !mac) return false;

  const expected = sign(issued);
  if (mac.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false;

  // Sessions last 30 days.
  const age = Date.now() - Number(issued);
  return Number.isFinite(age) && age >= 0 && age < 30 * 24 * 60 * 60 * 1000;
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return tokenIsValid(jar.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;

/** Constant-time string compare that does not leak length through throwing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
