import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WeatherApiLocation = {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  tz_id: string;
  localtime?: string;
};

type CacheRow = {
  at: number;
  body: unknown;
};

const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheRow>();

function roundCoord(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

function cacheKey(lat: number, lon: number, days: number): string {
  return `${roundCoord(lat).toFixed(2)},${roundCoord(lon).toFixed(2)}:d${days}`;
}

function cacheKeyQuery(q: string, days: number): string {
  return `q:${q.trim().toLowerCase()}:d${days}`;
}

function readCache(key: string): unknown | null {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return row.body;
}

function writeCache(key: string, body: unknown) {
  cache.set(key, { at: Date.now(), body });
  if (cache.size > 400) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

async function fetchWeatherApi(q: string, days: number) {
  const key = process.env.WEATHERAPI_KEY || process.env.WEATHER_API_KEY;
  if (!key) return null;
  const url =
    `https://api.weatherapi.com/v1/forecast.json` +
    `?key=${encodeURIComponent(key)}` +
    `&q=${encodeURIComponent(q)}` +
    `&days=${days}` +
    `&aqi=no&alerts=no`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`weatherapi_${res.status}:${text.slice(0, 160)}`);
  }
  return res.json();
}

/** Open-Meteo forecast + BigDataCloud reverse-geocode when WeatherAPI key is missing. */
async function fetchOpenMeteoFallback(lat: number, lon: number) {
  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);
  const [geoRes, wxRes] = await Promise.all([
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${rLat}&longitude=${rLon}&localityLanguage=en`,
      { cache: "no-store" }
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${rLat}&longitude=${rLon}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day` +
        `&hourly=temperature_2m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
        `&timezone=auto&forecast_days=2`,
      { cache: "no-store" }
    )
  ]);

  const geo = geoRes.ok ? await geoRes.json() : null;
  const wx = wxRes.ok ? await wxRes.json() : null;
  if (!wx?.current) throw new Error("open_meteo_empty");

  const cityName = String(
    geo?.city || geo?.locality || geo?.principalSubdivision || geo?.localityInfo?.informative?.[0]?.name || ""
  ).trim();
  const countryName = String(geo?.countryName || geo?.country || "").trim();
  // Prefer major hub names when GPS lands in a nearby municipality (e.g. Masis → Yerevan)
  const hubs: Array<{ city: string; country: string; lat: number; lon: number; tz: string; km: number }> = [
    { city: "Yerevan", country: "Armenia", lat: 40.1872, lon: 44.5152, tz: "Asia/Yerevan", km: 45 },
    { city: "Tbilisi", country: "Georgia", lat: 41.7151, lon: 44.8271, tz: "Asia/Tbilisi", km: 40 },
    { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, tz: "Europe/London", km: 50 },
    { city: "New York", country: "United States", lat: 40.7128, lon: -74.006, tz: "America/New_York", km: 50 }
  ];
  const toRad = (d: number) => (d * Math.PI) / 180;
  const distKm = (aLat: number, aLon: number, bLat: number, bLon: number) => {
    const R = 6371;
    const dLat = toRad(bLat - aLat);
    const dLon = toRad(bLon - aLon);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  };
  let hubHit: (typeof hubs)[number] | null = null;
  let best = Infinity;
  for (const h of hubs) {
    const d = distKm(rLat, rLon, h.lat, h.lon);
    if (d <= h.km && d < best) {
      hubHit = h;
      best = d;
    }
  }
  const location: WeatherApiLocation = {
    name: hubHit?.city || cityName || (wx.timezone === "Asia/Yerevan" ? "Yerevan" : "Your City"),
    region: String(geo?.principalSubdivision || geo?.admin1 || "").trim(),
    country:
      hubHit?.country || countryName || (wx.timezone === "Asia/Yerevan" ? "Armenia" : ""),
    lat: rLat,
    lon: rLon,
    tz_id: String(hubHit?.tz || wx.timezone || "UTC")
  };

  // Shape loosely like WeatherAPI so the client can normalize either source.
  return {
    location,
    current: {
      temp_c: wx.current.temperature_2m,
      temp_f: wx.current.temperature_2m * 1.8 + 32,
      feelslike_c: wx.current.apparent_temperature,
      feelslike_f: wx.current.apparent_temperature * 1.8 + 32,
      humidity: wx.current.relative_humidity_2m,
      wind_kph: wx.current.wind_speed_10m,
      wind_mph: wx.current.wind_speed_10m / 1.609,
      condition: {
        code: Number(wx.current.weather_code ?? 0),
        text: String(wx.current.weather_code ?? "Clear")
      },
      is_day: wx.current.is_day
    },
    forecast: {
      forecastday: [
        {
          day: {
            maxtemp_c: wx.daily?.temperature_2m_max?.[0],
            mintemp_c: wx.daily?.temperature_2m_min?.[0],
            maxtemp_f:
              wx.daily?.temperature_2m_max?.[0] != null
                ? wx.daily.temperature_2m_max[0] * 1.8 + 32
                : undefined,
            mintemp_f:
              wx.daily?.temperature_2m_min?.[0] != null
                ? wx.daily.temperature_2m_min[0] * 1.8 + 32
                : undefined
          },
          astro: {
            sunrise: wx.daily?.sunrise?.[0],
            sunset: wx.daily?.sunset?.[0]
          },
          hour: (wx.hourly?.time || []).slice(0, 24).map((t: string, i: number) => ({
            time: t,
            temp_c: wx.hourly.temperature_2m?.[i],
            temp_f:
              wx.hourly.temperature_2m?.[i] != null
                ? wx.hourly.temperature_2m[i] * 1.8 + 32
                : undefined,
            condition: { code: wx.hourly.weather_code?.[i] ?? 0, text: "" }
          }))
        }
      ]
    },
    source: "open-meteo-fallback"
  };
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const latRaw = sp.get("lat");
  const lonRaw = sp.get("lon");
  const qParam = String(sp.get("q") || "").trim();
  const days = Math.min(3, Math.max(1, Number(sp.get("days") || 1) || 1));

  const hasCoords =
    latRaw != null &&
    lonRaw != null &&
    Number.isFinite(Number(latRaw)) &&
    Number.isFinite(Number(lonRaw));

  if (!hasCoords && !qParam) {
    return NextResponse.json({ error: "Provide lat+lon or q" }, { status: 400 });
  }

  const lat = hasCoords ? Number(latRaw) : NaN;
  const lon = hasCoords ? Number(lonRaw) : NaN;
  const key = hasCoords ? cacheKey(lat, lon, days) : cacheKeyQuery(qParam, days);

  const cached = readCache(key);
  if (cached) {
    return NextResponse.json({ ...(cached as object), cached: true });
  }

  try {
    const q = hasCoords ? `${roundCoord(lat)},${roundCoord(lon)}` : qParam;
    let body = await fetchWeatherApi(q, days);

    if (!body) {
      if (!hasCoords) {
        return NextResponse.json(
          { error: "WEATHERAPI_KEY is not configured and q= requires WeatherAPI" },
          { status: 503 }
        );
      }
      body = await fetchOpenMeteoFallback(lat, lon);
    }

    if (!body?.location) {
      return NextResponse.json({ error: "weather_empty" }, { status: 502 });
    }

    writeCache(key, body);
    // Also cache by resolved coords when query was by city name
    if (body.location?.lat != null && body.location?.lon != null) {
      writeCache(cacheKey(Number(body.location.lat), Number(body.location.lon), days), body);
    }

    return NextResponse.json({ ...body, cached: false });
  } catch (err) {
    console.error("api.weather failed:", err);
    return NextResponse.json({ error: "weather_fetch_failed" }, { status: 502 });
  }
}
