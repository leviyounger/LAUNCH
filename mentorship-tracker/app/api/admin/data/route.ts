import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { demoRows } from '@/lib/demo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  if (process.env.DEMO_DATA === '1') {
    return NextResponse.json({ rows: demoRows() });
  }

  try {
    const rows = (await sql`
      select
        id,
        handle,
        display_name,
        program,
        orders_28,
        week_ending::text as week_ending,
        gmv_7,
        gmv_28,
        samples_sent,
        gmv_max_spend,
        videos_posted,
        lives_count,
        created_at
      from submissions
      order by handle asc, week_ending asc
    `) as Record<string, unknown>[];

    return NextResponse.json({ rows });
  } catch (err) {
    console.error('admin data failed', err);
    return NextResponse.json({ error: 'Could not load data.' }, { status: 500 });
  }
}
