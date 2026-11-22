import { getDailyQuote } from "@/lib/quotes";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

type Props = {
  /** Optional preloaded quote (skips server fetch when provided). */
  quote?: string;
  author?: string;
  context?: string;
  compact?: boolean;
};

export default async function QuoteOfTheDay({ quote, author, context, compact = false }: Props) {
  const data =
    quote && author
      ? { quote, author, context: context || "" }
      : await getDailyQuote();

  const attribution = data.context
    ? `— ${data.author}, ${data.context}`
    : `— ${data.author}`;

  return (
    <article
      aria-label="Quote of the Day"
      style={{
        border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
        borderLeft: `2px solid ${SNAPSHOT_THEME.gold}`,
        background: "rgba(12, 18, 32, 0.85)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        padding: compact ? "10px 14px" : "12px 16px",
        color: SNAPSHOT_THEME.ink,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
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
