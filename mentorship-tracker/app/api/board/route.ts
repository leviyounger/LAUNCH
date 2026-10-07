import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { programForCode } from '@/lib/program';
import { demoRows } from '@/lib/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Raw = {
  handle: string;
  display_name: string;
  program: string | null;
  week_ending: string;
  orders_28: number | null;
};

export type BoardRow = {
  handle: string;
  name: string;
  week: string;
  orders28: number | null;
  delta: number | null;
};

/**
 * The public standings. Every member who has submitted can read this, so it
 * returns only what the board shows: name, handle, 28 day orders and the week
 * over week change. Dollar figures never leave the server on this route; they
 * stay behind /admin. Each program only sees its own members.
 */
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

  try {
    const all = (process.env.DEMO_DATA === '1'
      ? (demoRows() as unknown as Raw[])
      : ((await sql`
          select handle, display_name, program, week_ending::text as week_ending, orders_28
          from submissions
          order by handle asc, week_ending asc
        `) as unknown as Raw[]));

    // Older rows from before programs existed count as Accelerator.
    const raw = all.filter((r) => (r.program || 'accelerator') === program);

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
      const a = latest.orders_28;
      const b = prev ? prev.orders_28 : null;
      rows.push({
        handle,
        name: latest.display_name,
        week: latest.week_ending,
        orders28: a,
        delta: a !== null && b !== null && b > 0 ? (a - b) / b : null,
      });
    }

    rows.sort((x, y) => (y.orders28 || 0) - (x.orders28 || 0));
    return NextResponse.json({ rows });
  } catch (err) {
    console.error('board failed', err);
    return NextResponse.json({ error: 'Could not load the board.' }, { status: 500 });
  }
}
