"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { EMERGENCY_FALLBACK_QUOTE } from "@/lib/quotes/fallback";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

type QuotePayload = {
  quote: string;
  author: string;
  context: string;
};

type Props = {
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function QuoteOfTheDayClient({ compact = false, className, style }: Props) {
  const [data, setData] = useState<QuotePayload>(EMERGENCY_FALLBACK_QUOTE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/quotes/daily", { credentials: "same-origin" });
        if (!res.ok) return;
        const json = (await res.json()) as Partial<QuotePayload>;
        if (cancelled) return;
        if (json.quote && json.author) {
          setData({
            quote: json.quote,
            author: json.author,
            context: json.context || ""
          });
        }
      } catch {
        // Keep emergency fallback.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const attribution = data.context
    ? `— ${data.author}, ${data.context}`
    : `— ${data.author}`;

  return (
    <article
      aria-label="Quote of the Day"
      className={className}
      style={{
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        borderLeft: `2px solid ${SNAPSHOT_THEME.gold}`,
        background: "var(--bg-card)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        padding: compact ? "10px 14px" : "12px 16px",
        color: SNAPSHOT_THEME.ink,
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        ...style
      }}
    >
      <a
        href="/dashboard/quotes"
        style={{
          margin: 0,
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: SNAPSHOT_THEME.dim,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace'
        }}
      >
        Quote of the Day
      </a>
      <p
        style={{
          margin: compact ? "6px 0 0" : "8px 0 0",
          fontSize: compact ? 12 : 13,
          lineHeight: 1.55,
          fontStyle: "italic",
          color: SNAPSHOT_THEME.ink
        }}
      >
        “{data.quote}”{" "}
        <span style={{ fontStyle: "normal", fontWeight: 600, color: SNAPSHOT_THEME.gold, fontSize: compact ? 11 : 12 }}>
          {attribution}
        </span>
      </p>
    </article>
  );
}
