import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { safeEqual } from '@/lib/auth';
import { demoRows } from '@/lib/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Raw = {
  handle: string;
  display_name: string;
  week_ending: string;
  gmv_7: string | number | null;
  gmv_28: string | number | null;
  samples_sent: number | null;
};

export type BoardRow = {
  handle: string;
  name: string;
  week: string;
  gmv7: number | null;
  gmv28: number | null;
  samples: number | null;
  delta: number | null;
};

const num = (v: string | number | null) => (v === null || v === '' ? null : Number(v));

/**
 * The public standings. Every mentee who has submitted can read this, so it
 * returns only what the board shows: one summary per person. Full week by week
 * history stays behind the admin route.
 */
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

  try {
    const raw = (process.env.DEMO_DATA === '1'
      ? (demoRows() as unknown as Raw[])
      : ((await sql`
          select handle, display_name, week_ending::text as week_ending, gmv_7, gmv_28, samples_sent
          from submissions
          order by handle asc, week_ending asc
        `) as unknown as Raw[]));

    const byHandle = new Map<string, Raw[]>();
    for (const r of raw) {
      const list = byHandle.get(r.handle) || [];
      list.push(r);
      byHandle.set(r.handle, list);
    }

    const rows: BoardRow[] = [];
    for (const [handle, list] of byHandle) {
      const sorted = [...list].sort((a, b) => a.week_ending.localeCompare(b.week_ending));
      const latest = sorted[sorted.length - 1];
      const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      const a = num(latest.gmv_28);
      const b = prev ? num(prev.gmv_28) : null;
      rows.push({
        handle,
        name: latest.display_name,
        week: latest.week_ending,
        gmv7: num(latest.gmv_7),
        gmv28: a,
        samples: latest.samples_sent,
        delta: a !== null && b !== null && b > 0 ? (a - b) / b : null,
      });
    }

    rows.sort((x, y) => (y.gmv28 || 0) - (x.gmv28 || 0));
    return NextResponse.json({ rows });
  } catch (err) {
    console.error('board failed', err);
    return NextResponse.json({ error: 'Could not load the board.' }, { status: 500 });
  }
}
