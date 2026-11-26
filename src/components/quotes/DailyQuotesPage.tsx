"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import {
  formatQuoteDayLabel,
  groupQuotesByYearMonth,
  type ListedDailyQuote
} from "@/lib/quotes/quoteArchive";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

const DASHBOARD_HREF = "/dashboard/index.html";

export default function DailyQuotesPage() {
  const [quotes, setQuotes] = useState<ListedDailyQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", { credentials: "same-origin" });
      if (!res.ok) throw new Error("quotes_http_" + res.status);
      const data = (await res.json()) as { quotes?: ListedDailyQuote[] };
      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch {
      setError("Could not load daily quotes.");
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupQuotesByYearMonth(quotes), [quotes]);
  const today = quotes.find((q) => q.isToday);

  return (
    <DashboardShell
      kicker="Command Center"
      title="Daily Quotes"
      subtitle="Scheduled Quote of the Day entries, sorted by year, month, and day (UTC)."
      actions={
        <>
          <button type="button" style={btnStyle} onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <a href={DASHBOARD_HREF} style={{ ...btnStyle, textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </>
      }
    >
      {today ? (
        <section style={{ ...panelStyle, marginBottom: 16, borderColor: "rgba(212, 175, 55, 0.45)" }}>
          <p style={kickerStyle}>Today</p>
          <p style={quoteStyle}>“{today.quote}”</p>
          <p style={attrStyle}>
            — {today.author}
            {today.context ? `, ${today.context}` : ""}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 10, color: SNAPSHOT_THEME.mute }}>
            {formatQuoteDayLabel(today.date)}
          </p>
        </section>
      ) : null}

      {loading && !quotes.length ? (
        <p style={{ color: SNAPSHOT_THEME.mute, fontSize: 12 }}>Loading quotes…</p>
      ) : null}

      {error ? <p style={{ color: SNAPSHOT_THEME.danger, fontSize: 12 }}>{error}</p> : null}

      {!loading && !error && !quotes.length ? (
        <section style={panelStyle}>
          <p style={{ margin: 0, color: SNAPSHOT_THEME.mute, fontSize: 12, lineHeight: 1.5 }}>
            No scheduled quotes in Firestore yet. Import the seed queue to populate this archive —
            until then, the dashboard shows the emergency fallback for any missing day.
          </p>
        </section>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((yearGroup) => (
          <section key={yearGroup.year}>
            <h2 style={yearStyle}>{yearGroup.year}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
              {yearGroup.months.map((monthGroup) => (
                <div key={`${yearGroup.year}-${monthGroup.month}`}>
                  <h3 style={monthStyle}>{monthGroup.monthLabel}</h3>
                  <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {monthGroup.quotes.map((item) => (
                      <li
                        key={item.date}
                        style={{
                          ...panelStyle,
                          borderColor: item.isToday ? "var(--accent-gold-border)" : SNAPSHOT_THEME.navyLine
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                          <p style={{ margin: 0, fontSize: 10, color: SNAPSHOT_THEME.mute, letterSpacing: "0.04em" }}>
                            {formatQuoteDayLabel(item.date)}
                          </p>
                          {item.isToday ? <span style={todayBadge}>Today</span> : null}
                        </div>
                        <p style={{ ...quoteStyle, fontSize: 12, marginTop: 8 }}>“{item.quote}”</p>
                        <p style={{ ...attrStyle, marginTop: 6 }}>
                          — {item.author}
                          {item.context ? `, ${item.context}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardShell>
  );
}

const btnStyle: CSSProperties = {
  appearance: "none",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: SNAPSHOT_THEME.navySoft,
  color: SNAPSHOT_THEME.ink,
  fontSize: 11,
  fontWeight: 700,
  padding: "7px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit"
};

const panelStyle: CSSProperties = {
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  background: `linear-gradient(165deg, ${SNAPSHOT_THEME.navySoft} 0%, ${SNAPSHOT_THEME.navy} 75%)`,
  borderRadius: 12,
  padding: "12px 14px"
};

const kickerStyle: CSSProperties = {
  margin: 0,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: SNAPSHOT_THEME.gold
};

const quoteStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.55,
  fontStyle: "italic",
  color: SNAPSHOT_THEME.ink
};

const attrStyle: CSSProperties = {
  margin: "8px 0 0",
  fontSize: 11,
  fontWeight: 600,
  color: SNAPSHOT_THEME.gold
};

const yearStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  color: SNAPSHOT_THEME.ink,
  letterSpacing: "0.02em"
};

const monthStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold
};

const todayBadge: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--accent-gold-fg)",
  background: SNAPSHOT_THEME.gold,
  borderRadius: 999,
  padding: "2px 8px"
};
