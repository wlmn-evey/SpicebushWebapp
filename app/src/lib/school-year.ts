import { getZonedParts } from './eastern-time';

/**
 * The school year rolls over on July 1: June 30 still belongs to the year that
 * started the previous fall, July 1 begins the next one. Used as the fallback
 * anywhere the `current_school_year` DB setting is missing so hardcoded
 * defaults can never go stale again (#128). The DB setting always wins when set.
 *
 * The month/year are read in the school's zone (America/New_York), not the
 * runtime's — Netlify runs in UTC, which would roll over at 8 PM ET on June 30.
 */
export function getCurrentSchoolYear(now: Date = new Date()): string {
  const { year, month } = getZonedParts(now);
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
