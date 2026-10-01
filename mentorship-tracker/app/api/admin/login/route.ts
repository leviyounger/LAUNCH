import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, makeToken, safeEqual } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Levi's PIN. Override it any time by setting ADMIN_PASSWORD in Vercel. */
const DEFAULT_PIN = '8054';

/**
 * A four digit PIN is only ten thousand guesses, so the delay alone is not
 * enough. Wrong guesses are counted per IP and the door shuts for a while.
 * This lives in memory, so a serverless instance recycling resets it; that is
 * a speed bump rather than a wall, and it is the right trade for numbers that
 * are not secrets.
 */
type Attempt = { count: number; until: number };
const attempts = new Map<string, Attempt>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;

function clientKey(req: Request) {
  const fwd = req.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

function blocked(key: string) {
  const a = attempts.get(key);
  if (!a) return 0;
  if (Date.now() > a.until) {
    attempts.delete(key);
    return 0;
  }
  return a.count >= MAX_TRIES ? Math.ceil((a.until - Date.now()) / 1000) : 0;
}

function recordFailure(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now > a.until) {
    attempts.set(key, { count: 1, until: now + WINDOW_MS });
  } else {
    a.count += 1;
    a.until = now + WINDOW_MS;
  }
}

export async function POST(req: Request) {
  const key = clientKey(req);

  const wait = blocked(key);
  if (wait) {
    const mins = Math.max(1, Math.round(wait / 60));
    return NextResponse.json(
      { error: `Too many wrong tries. Try again in about ${mins} minute${mins > 1 ? 's' : ''}.` },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const expected = process.env.ADMIN_PASSWORD || DEFAULT_PIN;
  const given = typeof body.password === 'string' ? body.password.trim() : '';

  if (!safeEqual(given, expected)) {
    recordFailure(key);
    await new Promise((r) => setTimeout(r, 700));
    return NextResponse.json({ error: 'Wrong PIN.' }, { status: 401 });
  }

  attempts.delete(key);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
