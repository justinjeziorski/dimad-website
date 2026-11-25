/** Major city hubs — snap nearby GPS hits to a clean display name. */

export type LocationHub = {
  city: string;
  country: string;
  lat: number;
  lon: number;
  tz_id: string;
  /** Snap radius in km */
  radiusKm: number;
};

export const LOCATION_HUBS: LocationHub[] = [
  { city: "Yerevan", country: "Armenia", lat: 40.1872, lon: 44.5152, tz_id: "Asia/Yerevan", radiusKm: 45 },
  { city: "Tbilisi", country: "Georgia", lat: 41.7151, lon: 44.8271, tz_id: "Asia/Tbilisi", radiusKm: 40 },
  { city: "Baku", country: "Azerbaijan", lat: 40.4093, lon: 49.8671, tz_id: "Asia/Baku", radiusKm: 40 },
  { city: "London", country: "United Kingdom", lat: 51.5074, lon: -0.1278, tz_id: "Europe/London", radiusKm: 50 },
  { city: "New York", country: "United States", lat: 40.7128, lon: -74.006, tz_id: "America/New_York", radiusKm: 50 },
  { city: "Los Angeles", country: "United States", lat: 34.0522, lon: -118.2437, tz_id: "America/Los_Angeles", radiusKm: 50 },
  { city: "Dubai", country: "United Arab Emirates", lat: 25.2048, lon: 55.2708, tz_id: "Asia/Dubai", radiusKm: 40 },
  { city: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, tz_id: "Asia/Tokyo", radiusKm: 45 },
  { city: "Paris", country: "France", lat: 48.8566, lon: 2.3522, tz_id: "Europe/Paris", radiusKm: 40 },
  { city: "Berlin", country: "Germany", lat: 52.52, lon: 13.405, tz_id: "Europe/Berlin", radiusKm: 40 }
];

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function snapToNearestHub(
  lat: number,
  lon: number
): LocationHub | null {
  let best: LocationHub | null = null;
  let bestDist = Infinity;
  for (const hub of LOCATION_HUBS) {
    const d = haversineKm(lat, lon, hub.lat, hub.lon);
    if (d <= hub.radiusKm && d < bestDist) {
      best = hub;
      bestDist = d;
    }
  }
  return best;
}

/** Prefer hub display names over raw municipality strings when GPS is nearby. */
export function refineLocationDisplay(input: {
  city: string;
  country: string;
  tz_id: string;
  lat: number;
  lon: number;
}): { city: string; country: string; tz_id: string; lat: number; lon: number } {
  const hub = snapToNearestHub(input.lat, input.lon);
  if (!hub) return input;
  return {
    city: hub.city,
    country: hub.country || input.country,
    tz_id: hub.tz_id || input.tz_id,
    lat: input.lat,
    lon: input.lon
  };
}
