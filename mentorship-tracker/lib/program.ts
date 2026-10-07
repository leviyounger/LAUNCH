import { safeEqual } from './auth';

export type Program = 'academy' | 'accelerator';

/**
 * One tracker, two groups. Each group gets its own access code, so the form
 * never has to ask which program someone is in, and nobody in Academy sees
 * that Accelerator exists. The code decides the program.
 *
 *   ACADEMY_CODE      code given to Academy members
 *   ACCELERATOR_CODE  code given to Accelerator members (falls back to FORM_CODE)
 */
export function programForCode(input: unknown): Program | null {
  const given = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (!given) return null;

  const academy = (process.env.ACADEMY_CODE || 'academy').trim().toLowerCase();
  const accelerator = (process.env.ACCELERATOR_CODE || process.env.FORM_CODE || 'levi').trim().toLowerCase();

  if (safeEqual(given, accelerator)) return 'accelerator';
  if (safeEqual(given, academy)) return 'academy';
  return null;
}
