import { NextResponse } from 'next/server';
import { programForCode } from '@/lib/program';
import { allSubmissions } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    // Rows from before programs existed count as Accelerator.
    const raw = (await allSubmissions()).filter((r) => (r.program || 'accelerator') === program);

    const byHandle = new Map<string, typeof raw>();
    let updated = '';
    for (const r of raw) {
      const list = byHandle.get(r.handle) || [];
      list.push(r);
      byHandle.set(r.handle, list);
      if (r.created_at > updated) updated = r.created_at;
    }

    const rows: BoardRow[] = [];
    for (const [handle, list] of byHandle) {
      const latest = list[list.length - 1];
      const prev = list.length > 1 ? list[list.length - 2] : null;
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
    return NextResponse.json({ rows, updated: updated || null });
  } catch (err) {
    console.error('board failed', err);
    return NextResponse.json({ error: 'Could not load the board.' }, { status: 500 });
  }
}
