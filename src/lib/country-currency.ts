import { COUNTRY_TOOLKIT_LIST } from "@/data/city-toolkit/countries";

/** Extract ISO 4217 code from toolkit strings like "Armenian Dram (AMD)". */
export function parseCurrencyCode(label: string | null | undefined): string | null {
  const raw = String(label || "").trim();
  if (!raw) return null;
  if (/^[A-Z]{3}$/.test(raw)) return raw;
  const paren = raw.match(/\(([A-Z]{3})\)\s*$/);
  if (paren) return paren[1]!;
  const bare = raw.match(/\b([A-Z]{3})\b/);
  return bare ? bare[1]! : null;
}

function buildMaps() {
  const byIso2 = new Map<string, string>();
  const byName = new Map<string, string>();

  for (const entry of COUNTRY_TOOLKIT_LIST) {
    const code = parseCurrencyCode(entry.currency);
    if (!code) continue;
    const iso2 = String(entry.iso2 || "")
      .trim()
      .toUpperCase();
    if (iso2.length === 2) byIso2.set(iso2, code);
    const name = String(entry.country || "")
      .trim()
      .toLowerCase();
    if (name) byName.set(name, code);
  }

  // Extra aliases / territories not always keyed by toolkit name spelling
  const aliases: Record<string, string> = {
    usa: "USD",
    "united states": "USD",
    "united states of america": "USD",
    uk: "GBP",
    "united kingdom": "GBP",
    britain: "GBP",
    england: "GBP",
    "south korea": "KRW",
    korea: "KRW",
    "uae": "AED",
    "united arab emirates": "AED",
    vietnam: "VND",
    "viet nam": "VND",
    czechia: "CZK",
    "czech republic": "CZK"
  };
  for (const [name, code] of Object.entries(aliases)) {
    if (!byName.has(name)) byName.set(name, code);
  }

  return { byIso2, byName };
}

const MAPS = buildMaps();

/**
 * Resolve ISO 4217 currency for an ISO 3166-1 alpha-2 code or country name.
 * Defaults to USD when unknown.
 */
export function getCurrencyForCountry(countryCodeOrName: string | null | undefined): string {
  const raw = String(countryCodeOrName || "").trim();
  if (!raw) return "USD";

  if (/^[A-Za-z]{2}$/.test(raw)) {
    return MAPS.byIso2.get(raw.toUpperCase()) || "USD";
  }

  const byName = MAPS.byName.get(raw.toLowerCase());
  if (byName) return byName;

  // Allow "Armenia (AM)" / "AM — Armenia"
  const isoInParens = raw.match(/\(([A-Za-z]{2})\)/);
  if (isoInParens) {
    return MAPS.byIso2.get(isoInParens[1]!.toUpperCase()) || "USD";
  }
  const leadingIso = raw.match(/^([A-Za-z]{2})\b/);
  if (leadingIso && MAPS.byIso2.has(leadingIso[1]!.toUpperCase())) {
    return MAPS.byIso2.get(leadingIso[1]!.toUpperCase())!;
  }

  return "USD";
}

export function listCountryCurrencyPairs(): Array<{ iso2: string; country: string; currency: string }> {
  return COUNTRY_TOOLKIT_LIST.map((entry) => ({
    iso2: entry.iso2,
    country: entry.country,
    currency: parseCurrencyCode(entry.currency) || "USD"
  }));
}
