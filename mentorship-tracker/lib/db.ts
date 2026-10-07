import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;

/**
 * Created on first query, not at import time, so `next build` succeeds before
 * the database is attached to the project.
 */
function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set. Attach a database to the project in Vercel.');
    client = neon(url);
  }
  return client;
}

function raw(strings: TemplateStringsArray, ...values: unknown[]) {
  return (db() as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>)(strings, ...values);
}

/**
 * Creates the table on a fresh database and adds any newer columns to an
 * older one, so nobody has to run SQL by hand. Runs once per server instance.
 */
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await raw`
        create table if not exists submissions (
          id            bigserial primary key,
          created_at    timestamptz not null default now(),
          week_ending   date        not null,
          handle        text        not null,
          display_name  text        not null,
          program       text,
          orders_28     integer,
          gmv_7         numeric(12,2),
          gmv_28        numeric(12,2),
          samples_sent  integer,
          gmv_max_spend numeric(12,2),
          videos_posted integer,
          lives_count   integer
        )`;
      await raw`alter table submissions add column if not exists program       text`;
      await raw`alter table submissions add column if not exists orders_28     integer`;
      await raw`alter table submissions add column if not exists gmv_max_spend numeric(12,2)`;
      await raw`alter table submissions add column if not exists videos_posted integer`;
      await raw`alter table submissions add column if not exists lives_count   integer`;
      await raw`create index if not exists submissions_handle_idx on submissions (handle)`;
      await raw`create index if not exists submissions_week_idx on submissions (week_ending desc)`;
      await raw`create unique index if not exists submissions_handle_week_uniq on submissions (handle, week_ending)`;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  await ensureSchema();
  return raw(strings, ...values);
}

/** Strip @, whitespace and case so one person is always one profile. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/** The Sunday that ends the current week, as YYYY-MM-DD. */
export function weekEnding(d = new Date()): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const daysUntilSunday = (7 - copy.getUTCDay()) % 7;
  copy.setUTCDate(copy.getUTCDate() + daysUntilSunday);
  return copy.toISOString().slice(0, 10);
}
