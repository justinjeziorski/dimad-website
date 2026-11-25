/** Shared weather helpers aligned with `CC_YOUR_CITY` in script.js. */

import { WORLD_CLOCK_CITIES } from "@/lib/city/worldClockCities";

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
  country?: string;
  tz_id?: string;
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

/** Additional world clocks only (local/current-city clock is separate). */
export const DEFAULT_WORLD_CLOCK_IDS = ["london", "new-york"] as const;

export const WORLD_CLOCK_CATALOG: { id: string; city: string; tz: string }[] = WORLD_CLOCK_CITIES;

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

export type WeatherApiLocation = {
  name: string;
  region?: string;
  country: string;
  lat: number;
  lon: number;
  tz_id: string;
};

export type WeatherApiResponse = {
  location?: WeatherApiLocation;
  current?: {
    temp_c?: number;
    temp_f?: number;
    feelslike_c?: number;
    feelslike_f?: number;
    humidity?: number;
    wind_kph?: number;
    wind_mph?: number;
    condition?: { code?: number; text?: string };
  };
  forecast?: {
    forecastday?: Array<{
      day?: {
        maxtemp_c?: number;
        mintemp_c?: number;
        maxtemp_f?: number;
        mintemp_f?: number;
      };
      astro?: { sunrise?: string; sunset?: string };
      hour?: Array<{
        time?: string;
        temp_c?: number;
        temp_f?: number;
        condition?: { code?: number; text?: string };
      }>;
    }>;
  };
  cached?: boolean;
  source?: string;
};

/** Map WeatherAPI (or open-meteo-shaped) payload → CityWeatherSnapshot. */
export function snapshotFromWeatherApi(
  payload: WeatherApiResponse,
  unit: TempUnit
): CityWeatherSnapshot | null {
  const cur = payload.current;
  if (!cur) return null;
  const day = payload.forecast?.forecastday?.[0]?.day;
  const astro = payload.forecast?.forecastday?.[0]?.astro;
  const temp = unit === "F" ? Number(cur.temp_f ?? cur.temp_c) : Number(cur.temp_c ?? cur.temp_f);
  const feels =
    unit === "F"
      ? Number(cur.feelslike_f ?? cur.feelslike_c ?? temp)
      : Number(cur.feelslike_c ?? cur.feelslike_f ?? temp);
  if (!Number.isFinite(temp)) return null;
  const hi =
    unit === "F"
      ? Number(day?.maxtemp_f ?? day?.maxtemp_c ?? temp)
      : Number(day?.maxtemp_c ?? day?.maxtemp_f ?? temp);
  const lo =
    unit === "F"
      ? Number(day?.mintemp_f ?? day?.mintemp_c ?? temp)
      : Number(day?.mintemp_c ?? day?.mintemp_f ?? temp);
  const wind = unit === "F" ? Number(cur.wind_mph ?? 0) : Number(cur.wind_kph ?? 0);
  const code = Number(cur.condition?.code ?? 0);
  const label = String(cur.condition?.text || "").trim() || weatherLabel(code);
  const hours = payload.forecast?.forecastday?.[0]?.hour || [];
  const nowMs = Date.now();
  const hourly: WeatherHourlySlot[] = [];
  for (let i = 0; i < hours.length && hourly.length < 6; i += 1) {
    const h = hours[i];
    const t = h.time ? new Date(h.time.replace(" ", "T")).getTime() : NaN;
    if (!Number.isFinite(t) || t < nowMs - 45 * 60 * 1000) continue;
    const ht = unit === "F" ? Number(h.temp_f ?? h.temp_c) : Number(h.temp_c ?? h.temp_f);
    hourly.push({
      label: new Date(t).toLocaleTimeString([], { hour: "numeric" }),
      temp: ht,
      code: Number(h.condition?.code ?? 0)
    });
  }
  return {
    temp,
    feels,
    hi,
    lo,
    humidity: cur.humidity != null ? Number(cur.humidity) : null,
    wind,
    code,
    label,
    sunrise: astro?.sunrise || null,
    sunset: astro?.sunset || null,
    hourly
  };
}

/** Client fetch → `/api/weather` (WeatherAPI location + forecast, cached server-side). */
export async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  unit: TempUnit = "C"
): Promise<WeatherApiResponse> {
  const url =
    `/api/weather?lat=${encodeURIComponent(String(roundCoord(lat)))}` +
    `&lon=${encodeURIComponent(String(roundCoord(lon)))}` +
    `&days=1&unit=${unit === "F" ? "F" : "C"}`;
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error("weather_proxy_" + res.status);
  const json = (await res.json()) as WeatherApiResponse;
  if (!json?.location) throw new Error("weather_no_location");
  return json;
}

export async function fetchWeatherByQuery(q: string): Promise<WeatherApiResponse> {
  const url = `/api/weather?q=${encodeURIComponent(q.trim())}&days=1`;
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error("weather_proxy_" + res.status);
  const json = (await res.json()) as WeatherApiResponse;
  if (!json?.location) throw new Error("weather_no_location");
  return json;
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
      // Local/current-city clock is separate — drop legacy primary "yerevan".
      const cleaned = ids
        .map(String)
        .filter((id) => id !== "yerevan")
        .filter((id) => WORLD_CLOCK_CATALOG.some((c) => c.id === id))
        .slice(0, 3);
      if (cleaned.length) return cleaned;
    }
  } catch {
    /* default */
  }
  return [...DEFAULT_WORLD_CLOCK_IDS];
}

export function writeSelectedClockIds(ids: string[]): string[] {
  const next = ids
    .map(String)
    .filter((id) => WORLD_CLOCK_CATALOG.some((c) => c.id === id))
    .slice(0, 3);
  try {
    localStorage.setItem(WORLD_CLOCKS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent("dimad:world-clocks"));
  } catch {
    /* ignore */
  }
  return next;
}

/** Toggle a city in the shared world-clock selection (max 3). */
export function toggleSelectedClockId(id: string, on: boolean): string[] {
  let ids = readSelectedClockIds();
  if (on) {
    if (ids.includes(id) || ids.length >= 3) return ids;
    ids = [...ids, id];
  } else {
    ids = ids.filter((item) => item !== id);
  }
  return writeSelectedClockIds(ids);
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
