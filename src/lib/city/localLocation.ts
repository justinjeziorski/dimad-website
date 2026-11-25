/** Persisted “your city” location for the dashboard header (separate from world clocks). */

export const LOCAL_LOCATION_KEY = "dimad_local_location_v1";
export const LOCATION_SERVICES_KEY = "dimad_location_services_enabled";

export function readLocationServicesEnabled(): boolean {
  try {
    const v = localStorage.getItem(LOCATION_SERVICES_KEY);
    if (v === "0" || v === "false") return false;
    if (v === "1" || v === "true") return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function writeLocationServicesEnabled(on: boolean): void {
  try {
    localStorage.setItem(LOCATION_SERVICES_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export type LocalLocation = {
  city: string;
  country: string;
  tz_id: string;
  lat: number;
  lon: number;
  /** true when user manually pinned a city */
  pinned?: boolean;
  updatedAt?: number;
};

export const DEFAULT_LOCAL_LOCATION: LocalLocation = {
  city: "Yerevan",
  country: "Armenia",
  tz_id: "Asia/Yerevan",
  lat: 40.18,
  lon: 44.5,
  pinned: false
};

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function readLocalLocation(): LocalLocation {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_LOCATION_KEY) || "");
    if (
      raw &&
      Number.isFinite(Number(raw.lat)) &&
      Number.isFinite(Number(raw.lon)) &&
      String(raw.city || "").trim()
    ) {
      return {
        city: String(raw.city).trim(),
        country: String(raw.country || "").trim(),
        tz_id: String(raw.tz_id || browserTimeZone()).trim() || browserTimeZone(),
        lat: Number(raw.lat),
        lon: Number(raw.lon),
        pinned: Boolean(raw.pinned),
        updatedAt: Number(raw.updatedAt || 0) || undefined
      };
    }
  } catch {
    /* fall through */
  }

  // Soft migrate from older weather last-loc
  try {
    const legacy = JSON.parse(localStorage.getItem("dimad_weather_last_loc") || "");
    if (legacy && Number.isFinite(Number(legacy.lat)) && Number.isFinite(Number(legacy.lon))) {
      return {
        city: String(legacy.city || "Your City").trim() || "Your City",
        country: String(legacy.country || "").trim(),
        tz_id: String(legacy.tz_id || browserTimeZone()).trim() || browserTimeZone(),
        lat: Number(legacy.lat),
        lon: Number(legacy.lon),
        pinned: false
      };
    }
  } catch {
    /* ignore */
  }

  const tz = browserTimeZone();
  if (tz === "Asia/Yerevan") {
    return { ...DEFAULT_LOCAL_LOCATION, tz_id: "Asia/Yerevan" };
  }
  return {
    ...DEFAULT_LOCAL_LOCATION,
    city: "Your City",
    country: "",
    tz_id: tz
  };
}

export function writeLocalLocation(loc: LocalLocation): LocalLocation {
  const next: LocalLocation = {
    city: String(loc.city || "Your City").trim() || "Your City",
    country: String(loc.country || "").trim(),
    tz_id: String(loc.tz_id || browserTimeZone()).trim() || browserTimeZone(),
    lat: Number(loc.lat),
    lon: Number(loc.lon),
    pinned: Boolean(loc.pinned),
    updatedAt: Date.now()
  };
  try {
    localStorage.setItem(LOCAL_LOCATION_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  // Keep legacy weather loc in sync for CC_YOUR_CITY
  try {
    localStorage.setItem(
      "dimad_weather_last_loc",
      JSON.stringify({
        lat: next.lat,
        lon: next.lon,
        city: next.city,
        country: next.country,
        tz_id: next.tz_id,
        at: next.updatedAt
      })
    );
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent("dimad:local-location", { detail: next }));
  } catch {
    /* ignore */
  }
  return next;
}

export function offsetLabelForTz(tz: string, now = new Date()): string {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName");
    return part ? part.value.replace("GMT", "UTC") : "";
  } catch {
    return "";
  }
}
