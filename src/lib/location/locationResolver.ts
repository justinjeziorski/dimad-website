export interface ResolvedLocation {
  city: string;
  cityKey: string;
  timezone?: string;
  source: "gps" | "ip_header" | "timezone_dropdown" | "manual_override" | "fallback";
}

const IANA_CITY_OVERRIDES: Record<string, string> = {
  "Asia/Ho_Chi_Minh": "Ho Chi Minh City",
  "Asia/Saigon": "Ho Chi Minh City",
  "Asia/Calcutta": "Kolkata",
  "Asia/Katmandu": "Kathmandu",
  "America/Argentina/Buenos_Aires": "Buenos Aires",
  "America/Indiana/Indianapolis": "Indianapolis",
  "Pacific/Auckland": "Auckland"
};

const NOMINATIM_UA = "DIMAD-OS/1.0 (world-clock location resolver)";

export function extractCityFromTimezone(timezone: string): ResolvedLocation {
  const zone = String(timezone || "").trim();
  if (IANA_CITY_OVERRIDES[zone]) {
    const city = IANA_CITY_OVERRIDES[zone];
    return {
      city,
      cityKey: normalizeCityKey(city),
      timezone: zone,
      source: "timezone_dropdown"
    };
  }

  const parts = zone.split("/");
  const rawCity = parts[parts.length - 1] || "New York";
  const cleanCity = rawCity.replace(/_/g, " ").trim() || "New York";

  return {
    city: cleanCity,
    cityKey: normalizeCityKey(cleanCity),
    timezone: zone || undefined,
    source: "timezone_dropdown"
  };
}

export function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function resolveCurrentLocation(): Promise<ResolvedLocation> {
  if (typeof window !== "undefined" && "geolocation" in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 6000,
          maximumAge: 300000
        });
      });

      const { latitude, longitude } = position.coords;
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": NOMINATIM_UA
          }
        }
      );

      if (geoRes.ok) {
        const data = await geoRes.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.state_district ||
          data.address?.county;

        if (city) {
          return {
            city,
            cityKey: normalizeCityKey(city),
            source: "gps"
          };
        }
      }
    } catch {
      // Permission denied, timeout, or a blocked GPS read falls through to the IP lookup.
    }
  }

  try {
    const ipRes = await fetch("/api/location/ip");
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData.city) {
        return {
          city: ipData.city,
          cityKey: normalizeCityKey(ipData.city),
          timezone: typeof ipData.timezone === "string" ? ipData.timezone : undefined,
          source: "ip_header"
        };
      }
    }
  } catch {
    // Fall through to the hard default.
  }

  return {
    city: "New York",
    cityKey: "new_york",
    source: "fallback"
  };
}
