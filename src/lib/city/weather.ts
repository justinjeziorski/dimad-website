/** Shared weather helpers aligned with `CC_YOUR_CITY` in script.js. */

export const CITY_TEMP_UNIT_KEY = "dimad_city_temp_unit";
export const CITY_WEATHER_LOC_KEY = "dimad_weather_last_loc";
export const CITY_WEATHER_CACHE_KEY = "dimad_weather_cache_v3";
export const CITY_WEATHER_SUN_KEY = "dimad_weather_sun_v1";
export const WORLD_CLOCKS_STORAGE_KEY = "dimad_world_clocks";
export const WEATHER_TTL_MS = 15 * 60 * 1000;

export type TempUnit = "C" | "F";

export type CityCoords = {
  lat: number;
  lon: number;
  city: string;
};

export type WeatherHourlySlot = {
  label: string;
  temp: number;
  code: number;
};

export type CityWeatherSnapshot = {
  temp: number;
  feels: number;
  hi: number;
  lo: number;
  humidity: number | null;
  wind: number;
  code: number;
  label: string;
  sunrise: string | null;
  sunset: string | null;
  hourly: WeatherHourlySlot[];
};

export type OpenMeteoPayload = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    relative_humidity_2m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    weather_code?: number[];
    sunrise?: string[];
    sunset?: string[];
    daylight_duration?: number[];
  };
};

export const DEFAULT_CITY: CityCoords = {
  lat: 40.18,
  lon: 44.5,
  city: "Yerevan"
};

export const DEFAULT_WORLD_CLOCK_IDS = ["yerevan", "london", "new-york"] as const;

export const WORLD_CLOCK_CATALOG: { id: string; city: string; tz: string }[] = [
  { id: "yerevan", city: "Yerevan", tz: "Asia/Yerevan" },
  { id: "london", city: "London", tz: "Europe/London" },
  { id: "new-york", city: "New York", tz: "America/New_York" },
  { id: "los-angeles", city: "Los Angeles", tz: "America/Los_Angeles" },
  { id: "dubai", city: "Dubai", tz: "Asia/Dubai" },
  { id: "tokyo", city: "Tokyo", tz: "Asia/Tokyo" },
  { id: "singapore", city: "Singapore", tz: "Asia/Singapore" },
  { id: "paris", city: "Paris", tz: "Europe/Paris" },
  { id: "berlin", city: "Berlin", tz: "Europe/Berlin" },
  { id: "tbilisi", city: "Tbilisi", tz: "Asia/Tbilisi" }
];

export function roundCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

export function weatherCacheKey(lat: number, lon: number, unit: TempUnit): string {
  return `${roundCoord(lat)},${roundCoord(lon)}:${unit === "F" ? "F" : "C"}`;
}

export function defaultTempUnit(): TempUnit {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || "").toLowerCase();
    if (locale === "en-us" || locale.endsWith("-us") || locale === "en-lr" || locale === "en-mm") {
      return "F";
    }
  } catch {
    /* ignore */
  }
  return "C";
}

export function readTempUnit(): TempUnit {
  try {
    const stored = localStorage.getItem(CITY_TEMP_UNIT_KEY);
    if (stored === "F" || stored === "C") return stored;
  } catch {
    /* ignore */
  }
  return defaultTempUnit();
}

export function writeTempUnit(unit: TempUnit): void {
  try {
    localStorage.setItem(CITY_TEMP_UNIT_KEY, unit === "F" ? "F" : "C");
  } catch {
    /* ignore */
  }
}

export function readLastLoc(): CityCoords | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CITY_WEATHER_LOC_KEY) || "");
    if (!raw || !Number.isFinite(Number(raw.lat)) || !Number.isFinite(Number(raw.lon))) return null;
    return {
      lat: Number(raw.lat),
      lon: Number(raw.lon),
      city: String(raw.city || "Your City")
    };
  } catch {
    return null;
  }
}

export function weatherLabel(code: number): string {
  const n = Number(code);
  if (n === 0) return "Clear";
  if (n === 1) return "Mainly clear";
  if (n === 2) return "Partly cloudy";
  if (n === 3) return "Overcast";
  if (n <= 48) return "Fog";
  if (n <= 57) return "Drizzle";
  if (n <= 67) return "Rain";
  if (n <= 77) return "Snow";
  if (n <= 82) return "Showers";
  if (n <= 86) return "Snow showers";
  if (n <= 99) return "Thunder";
  return "Weather";
}

export function formatSun(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatWind(value: number, unit: TempUnit): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)} ${unit === "F" ? "mph" : "km/h"}`;
}

export function readSessionCacheMap(key: string): Record<string, { fetchedAt?: number; city?: string; payload?: OpenMeteoPayload }> {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

export function getCachedWeather(lat: number, lon: number, unit: TempUnit): OpenMeteoPayload | null {
  const key = weatherCacheKey(lat, lon, unit);
  const map = readSessionCacheMap(CITY_WEATHER_CACHE_KEY);
  const row = map[key];
  if (row?.payload && Date.now() - Number(row.fetchedAt || 0) < WEATHER_TTL_MS) {
    return row.payload;
  }
  return null;
}

export function setCachedWeather(lat: number, lon: number, unit: TempUnit, city: string, payload: OpenMeteoPayload): void {
  const key = weatherCacheKey(lat, lon, unit);
  const map = readSessionCacheMap(CITY_WEATHER_CACHE_KEY);
  map[key] = { fetchedAt: Date.now(), city, payload };
  try {
    sessionStorage.setItem(CITY_WEATHER_CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function snapshotFromPayload(payload: OpenMeteoPayload): CityWeatherSnapshot | null {
  const current = payload.current;
  if (!current || current.temperature_2m == null) return null;
  const code = Number(current.weather_code ?? 0);
  const hourlyTimes = payload.hourly?.time || [];
  const hourlyTemps = payload.hourly?.temperature_2m || [];
  const hourlyCodes = payload.hourly?.weather_code || [];
  const nowMs = Date.now();
  const hourly: WeatherHourlySlot[] = [];
  for (let i = 0; i < hourlyTimes.length && hourly.length < 6; i += 1) {
    const t = new Date(hourlyTimes[i]).getTime();
    if (!Number.isFinite(t) || t < nowMs - 45 * 60 * 1000) continue;
    hourly.push({
      label: new Date(hourlyTimes[i]).toLocaleTimeString([], { hour: "numeric" }),
      temp: Number(hourlyTemps[i]),
      code: Number(hourlyCodes[i] ?? 0)
    });
  }
  return {
    temp: Number(current.temperature_2m),
    feels: Number(current.apparent_temperature ?? current.temperature_2m),
    hi: Number(payload.daily?.temperature_2m_max?.[0] ?? current.temperature_2m),
    lo: Number(payload.daily?.temperature_2m_min?.[0] ?? current.temperature_2m),
    humidity: current.relative_humidity_2m != null ? Number(current.relative_humidity_2m) : null,
    wind: Number(current.wind_speed_10m ?? 0),
    code,
    label: weatherLabel(code),
    sunrise: formatSun(payload.daily?.sunrise?.[0]),
    sunset: formatSun(payload.daily?.sunset?.[0]),
    hourly
  };
}

export async function fetchOpenMeteo(lat: number, lon: number, unit: TempUnit, force = false): Promise<OpenMeteoPayload> {
  if (!force) {
    const cached = getCachedWeather(lat, lon, unit);
    if (cached) return cached;
  }
  const tempUnit = unit === "F" ? "fahrenheit" : "celsius";
  const windUnit = unit === "F" ? "mph" : "kmh";
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(String(roundCoord(lat)))}` +
    `&longitude=${encodeURIComponent(String(roundCoord(lon)))}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration` +
    `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather_http_" + res.status);
  const payload = (await res.json()) as OpenMeteoPayload;
  if (!payload?.current) throw new Error("weather_empty");
  return payload;
}

export function offsetLabel(tz: string, now = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName");
    return part ? part.value.replace("GMT", "UTC") : "";
  } catch {
    return "";
  }
}

export function readSelectedClockIds(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(WORLD_CLOCKS_STORAGE_KEY) || "");
    if (Array.isArray(ids) && ids.length) {
      return ids
        .map(String)
        .filter((id) => WORLD_CLOCK_CATALOG.some((c) => c.id === id) || id === "yerevan" || id === "london" || id === "new-york")
        .slice(0, 3);
    }
  } catch {
    /* default */
  }
  return [...DEFAULT_WORLD_CLOCK_IDS];
}

export function resolveSelectedClocks(
  lookup?: (id: string) => { id: string; city: string; tz: string } | null | undefined
): { id: string; city: string; tz: string; utcLabel: string }[] {
  const now = new Date();
  return readSelectedClockIds()
    .map((id) => {
      const hit = lookup?.(id) || WORLD_CLOCK_CATALOG.find((c) => c.id === id);
      if (!hit) return null;
      return { id: hit.id, city: hit.city, tz: hit.tz, utcLabel: offsetLabel(hit.tz, now) };
    })
    .filter(Boolean) as { id: string; city: string; tz: string; utcLabel: string }[];
}
