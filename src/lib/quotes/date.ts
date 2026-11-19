const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date as YYYY-MM-DD in UTC. */
export function utcTodayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isUtcDateKey(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Add `days` to a YYYY-MM-DD UTC key. */
export function addUtcDays(dateKey: string, days: number): string {
  if (!isUtcDateKey(dateKey)) {
    throw new Error(`invalid_utc_date_key:${dateKey}`);
  }
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Seconds remaining until the next UTC midnight (min 60). */
export function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.floor((next - now.getTime()) / 1000));
}
