import { NextResponse } from 'next/server';
import { normalizeHandle, weekEnding } from '@/lib/db';
import { saveSubmission } from '@/lib/store';
import { programForCode } from '@/lib/program';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function money(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function count(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const cleaned = v.replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  const program = programForCode(body.code);
  if (!program) {
    return NextResponse.json({ error: 'Wrong code.' }, { status: 401 });
  }

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 120) : '';
  const handle = normalizeHandle(typeof body.handle === 'string' ? body.handle : '').slice(0, 80);

  if (!displayName || !handle) {
    return NextResponse.json({ error: 'Name and TikTok handle are both required.' }, { status: 400 });
  }

  const orders28 = count(body.orders28);
  if (orders28 === null) {
    return NextResponse.json({ error: 'Add your orders for the last 28 days. Use 0 if you have none yet.' }, { status: 400 });
  }

  try {
    await saveSubmission({
      week_ending: weekEnding(),
      handle,
      display_name: displayName,
      program,
      orders_28: orders28,
      gmv_7: money(body.gmv7),
      gmv_28: money(body.gmv28),
      samples_sent: count(body.samples),
      gmv_max_spend: money(body.spend),
      videos_posted: count(body.videos),
      lives_count: count(body.lives),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('submit failed', err);
    return NextResponse.json({ error: 'Could not save that. Try again in a moment.' }, { status: 500 });
  }
}
