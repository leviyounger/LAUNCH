import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let client: NeonQueryFunction<false, false> | null = null;

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

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return (db() as unknown as (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>)(strings, ...values);
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
