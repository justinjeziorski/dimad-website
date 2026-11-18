export type DimadTimeframe = "24H" | "7D" | "30D" | "90D" | "YTD" | "1Y" | "All" | "Custom";

export type CustomDateRange = {
  startDate: string;
  endDate: string;
};

export type TimeBucketGranularity = "hour" | "day" | "week" | "month";

export const DIMAD_TIMEFRAMES: DimadTimeframe[] = [
  "24H",
  "7D",
  "30D",
  "90D",
  "YTD",
  "1Y",
  "All",
  "Custom"
];

export const DIMAD_TIMEFRAME_LABELS: Record<DimadTimeframe, string> = {
  "24H": "24H",
  "7D": "7D",
  "30D": "30D",
  "90D": "90D",
  YTD: "YTD",
  "1Y": "1Y",
  All: "All",
  Custom: "Custom"
};

type Timestamped = { date?: string; timestamp?: string | number; createdAt?: string };

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStart(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function parseStamp(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

export function getItemTimestamp(item: Timestamped): number | null {
  return (
    parseStamp(item.date) ??
    parseStamp(item.timestamp) ??
    parseStamp(item.createdAt)
  );
}

export function getTimeframeWindow(
  timeframe: DimadTimeframe,
  customRange?: CustomDateRange | null,
  now = new Date()
): { from: Date; to: Date } {
  const to = new Date(now);
  if (timeframe === "Custom" && customRange?.startDate && customRange?.endDate) {
    const from = new Date(`${customRange.startDate}T00:00:00`);
    const end = new Date(`${customRange.endDate}T23:59:59.999`);
    return { from, to: end };
  }

  const from = startOfDay(now);
  if (timeframe === "24H") {
    return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000), to };
  }
  if (timeframe === "7D") from.setDate(from.getDate() - 6);
  else if (timeframe === "30D") from.setDate(from.getDate() - 29);
  else if (timeframe === "90D") from.setDate(from.getDate() - 89);
  else if (timeframe === "YTD") from.setMonth(0, 1);
  else if (timeframe === "1Y") from.setFullYear(from.getFullYear() - 1);
  else if (timeframe === "All") from.setFullYear(from.getFullYear() - 10);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** Automatic bucket grain for charts based on selected timeframe. */
export function getBucketGranularity(timeframe: DimadTimeframe, daySpan?: number): TimeBucketGranularity {
  if (timeframe === "24H") return "hour";
  if (timeframe === "7D" || timeframe === "30D") return "day";
  if (timeframe === "90D") return "week";
  if (timeframe === "YTD" || timeframe === "1Y") return "month";
  if (timeframe === "All") return (daySpan || 0) > 400 ? "month" : "week";
  // Custom — choose by span
  const span = daySpan || 30;
  if (span <= 2) return "hour";
  if (span <= 45) return "day";
  if (span <= 120) return "week";
  return "month";
}

export function filterDataByTimeframe<T extends Timestamped>(
  data: T[],
  timeframe: DimadTimeframe,
  customRange?: CustomDateRange | null
): T[] {
  const { from, to } = getTimeframeWindow(timeframe, customRange);
  const fromMs = from.getTime();
  const toMs = to.getTime();
  return data.filter((item) => {
    const t = getItemTimestamp(item);
    if (t == null) return false;
    return t >= fromMs && t <= toMs;
  });
}

export type TimeBucket<T> = {
  key: string;
  label: string;
  from: string;
  to: string;
  items: T[];
};

export function groupDataIntoBuckets<T extends Timestamped>(
  data: T[],
  timeframe: DimadTimeframe,
  customRange?: CustomDateRange | null
): TimeBucket<T>[] {
  const { from, to } = getTimeframeWindow(timeframe, customRange);
  const daySpan = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const gran = getBucketGranularity(timeframe, daySpan);
  const map = new Map<string, T[]>();

  const ensureKeys = () => {
    const cursor = new Date(from);
    if (gran === "month") cursor.setDate(1);
    if (gran === "week") {
      const ws = weekStart(cursor);
      cursor.setTime(ws.getTime());
    }
    if (gran === "hour") cursor.setMinutes(0, 0, 0);

    while (cursor.getTime() <= to.getTime()) {
      const key = bucketKey(cursor, gran);
      if (!map.has(key)) map.set(key, []);
      if (gran === "hour") cursor.setHours(cursor.getHours() + 1);
      else if (gran === "day") cursor.setDate(cursor.getDate() + 1);
      else if (gran === "week") cursor.setDate(cursor.getDate() + 7);
      else cursor.setMonth(cursor.getMonth() + 1, 1);
    }
  };
  ensureKeys();

  for (const item of data) {
    const t = getItemTimestamp(item);
    if (t == null || t < from.getTime() || t > to.getTime()) continue;
    const key = bucketKey(new Date(t), gran);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }

  return Array.from(map.keys())
    .sort()
    .map((key) => {
      const range = bucketRange(key, gran);
      return {
        key,
        label: bucketLabel(key, gran),
        from: range.from,
        to: range.to,
        items: map.get(key) || []
      };
    });
}

function bucketKey(d: Date, gran: TimeBucketGranularity) {
  if (gran === "hour") {
    return `${isoDay(d)}T${String(d.getHours()).padStart(2, "0")}`;
  }
  if (gran === "day") return isoDay(startOfDay(d));
  if (gran === "week") return isoDay(weekStart(d));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function bucketLabel(key: string, gran: TimeBucketGranularity) {
  if (gran === "hour") {
    const [day, hour] = key.split("T");
    const d = new Date(`${day}T12:00:00`);
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${hour}:00`;
  }
  if (gran === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y!, (m || 1) - 1, 1).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit"
    });
  }
  const d = new Date(`${key}T12:00:00`);
  if (gran === "week") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function bucketRange(key: string, gran: TimeBucketGranularity): { from: string; to: string } {
  if (gran === "hour") {
    const day = key.slice(0, 10);
    return { from: day, to: day };
  }
  if (gran === "month") {
    const [y, m] = key.split("-").map(Number);
    const from = `${key}-01`;
    const to = isoDay(new Date(y!, m!, 0));
    return { from, to };
  }
  if (gran === "week") {
    const end = new Date(`${key}T12:00:00`);
    end.setDate(end.getDate() + 6);
    return { from: key, to: isoDay(end) };
  }
  return { from: key, to: key };
}
