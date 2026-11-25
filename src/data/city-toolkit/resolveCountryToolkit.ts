import {
  COUNTRY_TOOLKIT_BY_NAME,
  type CountryToolkitEntry
} from "@/data/city-toolkit/countries";

/** Common geocoder / colloquial aliases → keys in COUNTRY_TOOLKIT_BY_NAME. */
const COUNTRY_ALIASES: Record<string, string> = {
  "united states of america": "united states",
  usa: "united states",
  us: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  turkey: "turkiye",
  türkiye: "turkiye",
  "czech republic": "czechia",
  "united arab emirates": "uae",
  "south korea": "south korea",
  "republic of korea": "south korea",
  "korea, republic of": "south korea",
  korea: "south korea",
  "great britain": "united kingdom",
  britain: "united kingdom",
  uk: "united kingdom",
  "u.k.": "united kingdom",
  england: "united kingdom",
  "viet nam": "vietnam",
  "bosnia & herzegovina": "bosnia and herzegovina",
  "north macedonia": "north macedonia",
  macedonia: "north macedonia",
  "republic of north macedonia": "north macedonia",
  "hong kong sar": "hong kong",
  "hong kong, china": "hong kong"
};

/** Safe defaults when a country is not yet in the 86-entry toolkit. */
export const FALLBACK_COUNTRY_TOOLKIT: CountryToolkitEntry = {
  id: 0,
  country: "Unknown",
  type: "Country",
  nationalLanguage: "—",
  hello: "Hello",
  regionalExceptions: null,
  rideshare: "None",
  rideshareUrl: null,
  foodDelivery: "None",
  foodDeliveryUrl: null,
  groceryDelivery: "None",
  groceryDeliveryUrl: null,
  emergencyNumber: "112",
  currency: "—",
  plugTypes: "—",
  nordVpn: false,
  safetyWing: false,
  airalo: false
};

export function normalizeCountryToolkitKey(input: string): string {
  const key = input.trim().toLowerCase();
  if (!key) return "";
  return COUNTRY_ALIASES[key] ?? key;
}

/**
 * Resolve a country name to a toolkit entry.
 * Unknown / empty inputs return FALLBACK_COUNTRY_TOOLKIT (never throws).
 */
export function resolveCountryToolkit(
  country?: string | null
): CountryToolkitEntry {
  const raw = String(country ?? "").trim();
  if (!raw) return FALLBACK_COUNTRY_TOOLKIT;

  const key = normalizeCountryToolkitKey(raw);
  const hit = COUNTRY_TOOLKIT_BY_NAME[key];
  if (hit) return hit;

  return {
    ...FALLBACK_COUNTRY_TOOLKIT,
    country: raw
  };
}

export function isCountryToolkitFallback(entry: CountryToolkitEntry): boolean {
  return entry.id === 0;
}

/** Only treat non-empty strings as clickable hrefs. */
export function toolkitLinkOrNull(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed ? trimmed : null;
}

export type ParsedToolkitHello = {
  /** Large primary greeting — Latin / romanized form when a dual-script hello exists. */
  primary: string;
  /** Smaller line above primary — national script only (no parentheses). */
  nativeScript?: string;
};

/** Letters outside Latin + Latin Extended → treat as a national-script greeting. */
const NON_LATIN_LETTER = /[^\u0000-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\uA720-\uA7FF\s'’\-./]/;

/**
 * Split toolkit hello values like "สวัสดี (Sawasdee)" into:
 * - primary: "Sawasdee" (Latin, large)
 * - nativeScript: "สวัสดี" (national alphabet, smaller, above)
 * Latin-only greetings ("Hola", "Olá") stay as a single primary line.
 */
export function parseToolkitHello(hello?: string | null): ParsedToolkitHello {
  const raw = String(hello ?? "").trim();
  if (!raw) return { primary: "Hello" };

  const dual = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (dual) {
    const native = dual[1]!.trim();
    const latin = dual[2]!.trim();
    if (native && latin && NON_LATIN_LETTER.test(native)) {
      return { primary: latin, nativeScript: native };
    }
  }

  return { primary: raw };
}
