"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeftRight, CircleDollarSign } from "lucide-react";
import { getCurrencyForCountry } from "@/lib/country-currency";

type FxCurrency = {
  code: string;
  name: string;
  symbol?: string;
  type?: string;
};

type CurrencyConverterTabProps = {
  countryCode?: string;
  countryName?: string;
  /** Preferred full label from toolkit, e.g. "Armenian Dram (AMD)". */
  currencyLabel?: string;
};

function formatCurrencyLabel(code: string, name?: string, preferred?: string): string {
  const preferredTrim = String(preferred || "").trim();
  if (preferredTrim && preferredTrim.includes(`(${code})`)) return preferredTrim;
  if (preferredTrim && /\([A-Z]{3}\)/.test(preferredTrim)) return preferredTrim;
  const cleanName = String(name || "").trim();
  if (cleanName && cleanName.toUpperCase() !== code) return `${cleanName} (${code})`;
  return code;
}

const HOME_CURRENCY_KEY = "dimad_home_currency";
const POPULAR = ["USD", "EUR", "GBP", "AMD", "JPY", "THB", "AED", "GEL", "MXN", "KRW", "VND", "IDR", "TRY", "CAD", "AUD"];

function readHomeCurrency(): string {
  try {
    const v = localStorage.getItem(HOME_CURRENCY_KEY);
    if (v && /^[A-Z]{3}$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return "USD";
}

function writeHomeCurrency(code: string) {
  try {
    localStorage.setItem(HOME_CURRENCY_KEY, code);
  } catch {
    /* ignore */
  }
}

function resolveLocalCurrency(countryCode?: string, countryName?: string): string {
  if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) {
    return getCurrencyForCountry(countryCode);
  }
  if (countryName) return getCurrencyForCountry(countryName);
  return "USD";
}

export default function CurrencyConverterTab({
  countryCode = "",
  countryName = "",
  currencyLabel = ""
}: CurrencyConverterTabProps) {
  const localCurrency = useMemo(
    () => resolveLocalCurrency(countryCode, countryName),
    [countryCode, countryName]
  );

  const [amount, setAmount] = useState("100");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState(localCurrency);
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [rateDate, setRateDate] = useState("");
  const [currencies, setCurrencies] = useState<FxCurrency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Keep To locked to active city currency whenever location changes.
  useEffect(() => {
    const nextTo = localCurrency || "USD";
    setToCurrency(nextTo);
    setFromCurrency((prev) => {
      const home = readHomeCurrency();
      let nextFrom = home || prev || "USD";
      if (nextFrom === nextTo) nextFrom = nextTo === "USD" ? "EUR" : "USD";
      return nextFrom;
    });
  }, [localCurrency]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fx?currencies=1", { credentials: "same-origin" });
        if (!res.ok) return;
        const json = (await res.json()) as { currencies?: FxCurrency[] };
        if (cancelled || !Array.isArray(json.currencies)) return;
        const fiat = json.currencies.filter((c) => (c.type || "currency") === "currency");
        setCurrencies(fiat.length ? fiat : json.currencies);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = fromCurrency || "USD";
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/api/fx?base=${encodeURIComponent(base)}`, {
          credentials: "same-origin"
        });
        if (!res.ok) throw new Error(`fx_${res.status}`);
        const json = (await res.json()) as {
          base?: string;
          date?: string;
          rates?: Record<string, number>;
        };
        if (cancelled) return;
        setRates(json.rates && typeof json.rates === "object" ? json.rates : { [base]: 1 });
        setRateDate(String(json.date || ""));
      } catch {
        if (!cancelled) setError("Rates unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fromCurrency]);

  const amountNum = Number(String(amount).replace(/,/g, ""));
  const rate = toCurrency === fromCurrency ? 1 : Number(rates[toCurrency] ?? NaN);
  const converted =
    Number.isFinite(amountNum) && Number.isFinite(rate) ? amountNum * rate : null;

  const selectOptions = useMemo(() => {
    const codes = new Set<string>();
    const list: FxCurrency[] = [];
    const push = (code: string, name = code) => {
      const c = code.toUpperCase();
      if (!c || codes.has(c)) return;
      codes.add(c);
      list.push({ code: c, name });
    };
    for (const p of POPULAR) push(p);
    push(fromCurrency);
    push(toCurrency);
    push(localCurrency);
    for (const c of currencies) push(c.code, c.name || c.code);
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [currencies, fromCurrency, toCurrency, localCurrency]);

  const localCurrencyDisplay = useMemo(() => {
    const fromDir = currencies.find((c) => c.code === localCurrency);
    return formatCurrencyLabel(localCurrency, fromDir?.name, currencyLabel);
  }, [currencies, localCurrency, currencyLabel]);

  const onFromChange = (code: string) => {
    const next = code.toUpperCase();
    writeHomeCurrency(next);
    if (next === toCurrency) {
      setToCurrency(fromCurrency);
    }
    setFromCurrency(next);
  };

  const onToChange = (code: string) => {
    const next = code.toUpperCase();
    if (next === fromCurrency) {
      setFromCurrency(toCurrency);
      writeHomeCurrency(toCurrency);
    }
    setToCurrency(next);
  };

  const swap = () => {
    setFromCurrency(toCurrency);
    writeHomeCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const fieldStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(2,6,23,0.28)",
    color: "#e2e8f0",
    fontSize: 12,
    padding: "8px 10px",
    outline: "none",
    backdropFilter: "blur(2px)"
  };

  const rateLine = loading
    ? "Updating rates…"
    : error
      ? error
      : Number.isFinite(rate)
        ? `1 ${fromCurrency} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toCurrency}`
        : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "transparent" }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <CircleDollarSign className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-100">Converter</span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "#fde68a",
            textShadow: "0 1px 2px rgba(0,0,0,0.65)",
            whiteSpace: "nowrap"
          }}
          title="Synced with Your City location"
        >
          {localCurrencyDisplay}
        </span>
      </div>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Amount</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={fieldStyle}
          aria-label="Amount to convert"
        />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">From</span>
          <select
            value={fromCurrency}
            onChange={(e) => onFromChange(e.target.value)}
            style={fieldStyle}
            aria-label="From currency"
          >
            {selectOptions.map((c) => (
              <option key={`from-${c.code}`} value={c.code}>
                {c.code}
                {c.name && c.name !== c.code ? ` — ${c.name}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={swap}
          title="Swap currencies"
          className="mb-0.5 p-2 rounded-lg border border-white/15 text-amber-300 hover:bg-amber-400/10 transition"
          aria-label="Swap currencies"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">To</span>
          <select
            value={toCurrency}
            onChange={(e) => onToChange(e.target.value)}
            style={fieldStyle}
            aria-label="To currency"
          >
            {selectOptions.map((c) => (
              <option key={`to-${c.code}`} value={c.code}>
                {c.code}
                {c.name && c.name !== c.code ? ` — ${c.name}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Conversion</div>
          {rateDate ? (
            <div className="text-[10px] text-slate-500 font-mono text-right whitespace-nowrap">{rateDate}</div>
          ) : null}
        </div>
        <div className="text-lg font-mono font-bold text-amber-300 tracking-tight">
          {converted == null
            ? "—"
            : converted.toLocaleString(undefined, {
                maximumFractionDigits: converted >= 1000 ? 2 : 4
              })}{" "}
          <span className="text-sm text-slate-200">{toCurrency}</span>
        </div>
        <div className="text-[10px] text-slate-400 mt-1 font-mono">{rateLine}</div>
      </div>
    </div>
  );
}
