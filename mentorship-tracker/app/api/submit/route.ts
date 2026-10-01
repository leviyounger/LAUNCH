import { NextResponse } from 'next/server';
import { sql, normalizeHandle, weekEnding } from '@/lib/db';
import { safeEqual } from '@/lib/auth';

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

  const expected = process.env.FORM_CODE || 'levi';
  const given = typeof body.code === 'string' ? body.code.trim().toLowerCase() : '';
  if (!safeEqual(given, expected.toLowerCase())) {
    return NextResponse.json({ error: 'Wrong code.' }, { status: 401 });
  }

  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 120) : '';
  const rawHandle = typeof body.handle === 'string' ? body.handle : '';
  const handle = normalizeHandle(rawHandle).slice(0, 80);

  if (!displayName || !handle) {
    return NextResponse.json({ error: 'Name and TikTok handle are both required.' }, { status: 400 });
  }

  try {
    await sql`
      insert into submissions (week_ending, handle, display_name, gmv_7, gmv_28, samples_sent, gmv_max_spend, videos_posted, lives_count)
      values (
        ${weekEnding()}::date,
        ${handle},
        ${displayName},
        ${money(body.gmv7)},
        ${money(body.gmv28)},
        ${count(body.samples)},
        ${money(body.spend)},
        ${count(body.videos)},
        ${count(body.lives)}
      )
      on conflict (handle, week_ending) do update set
        display_name = excluded.display_name,
        gmv_7        = excluded.gmv_7,
        gmv_28       = excluded.gmv_28,
        samples_sent  = excluded.samples_sent,
        gmv_max_spend = excluded.gmv_max_spend,
        videos_posted = excluded.videos_posted,
        lives_count   = excluded.lives_count,
        created_at    = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('submit failed', err);
    return NextResponse.json({ error: 'Could not save that. Try again in a moment.' }, { status: 500 });
  }
}
