import { format } from "date-fns";
import type { GlobalHoliday } from "@/lib/calendar/types";

/** nth weekday of month (0=Sun). */
function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): Date {
  const first = new Date(year, monthIndex, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(year, monthIndex, day);
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const last = new Date(year, monthIndex + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, last.getDate() - offset);
}

/**
 * Synchronous global holiday set for any year (US + major observances).
 * Safe for past/future years — no network.
 */
export function getGlobalHolidays(year: number): GlobalHoliday[] {
  if (!Number.isFinite(year)) return [];
  const y = Math.trunc(year);
  const fixed: Array<[number, number, string, string?]> = [
    [0, 1, "New Year's Day"],
    [1, 14, "Valentine's Day"],
    [2, 17, "St. Patrick's Day"],
    [6, 4, "Independence Day", "US"],
    [9, 31, "Halloween"],
    [10, 11, "Veterans Day", "US"],
    [11, 25, "Christmas Day"],
    [11, 26, "Boxing Day"],
    [11, 31, "New Year's Eve"]
  ];

  const rows: GlobalHoliday[] = fixed.map(([m, d, title, region]) => {
    const date = new Date(y, m, d);
    return {
      id: `hol-${y}-${m + 1}-${d}`,
      title,
      date: format(date, "yyyy-MM-dd"),
      region
    };
  });

  const computed: Array<[Date, string, string?]> = [
    [nthWeekday(y, 0, 1, 3), "Martin Luther King Jr. Day", "US"],
    [nthWeekday(y, 1, 1, 3), "Presidents' Day", "US"],
    [lastWeekday(y, 4, 1), "Memorial Day", "US"],
    [nthWeekday(y, 8, 1, 1), "Labor Day", "US"],
    [nthWeekday(y, 9, 1, 2), "Columbus Day", "US"],
    [nthWeekday(y, 10, 4, 4), "Thanksgiving", "US"]
  ];

  computed.forEach(([date, title, region]) => {
    rows.push({
      id: `hol-${format(date, "yyyy-MM-dd")}-${title.replace(/\s+/g, "-").toLowerCase()}`,
      title,
      date: format(date, "yyyy-MM-dd"),
      region
    });
  });

  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

const holidayYearCache = new Map<number, GlobalHoliday[]>();

export function holidaysForYear(year: number): GlobalHoliday[] {
  const y = Math.trunc(year);
  let rows = holidayYearCache.get(y);
  if (!rows) {
    rows = getGlobalHolidays(y);
    holidayYearCache.set(y, rows);
  }
  return rows;
}

export function holidaysInRange(start: Date, end: Date): GlobalHoliday[] {
  const years = new Set<number>();
  years.add(start.getFullYear());
  years.add(end.getFullYear());
  const out: GlobalHoliday[] = [];
  years.forEach((y) => {
    holidaysForYear(y).forEach((h) => {
      if (h.date >= format(start, "yyyy-MM-dd") && h.date <= format(end, "yyyy-MM-dd")) {
        out.push(h);
      }
    });
  });
  return out;
}

export function holidaysOnDate(dateKey: string): GlobalHoliday[] {
  const y = Number(dateKey.slice(0, 4));
  if (!Number.isFinite(y)) return [];
  return holidaysForYear(y).filter((h) => h.date === dateKey);
}
