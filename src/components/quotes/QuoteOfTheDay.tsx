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
        background: `linear-gradient(165deg, ${SNAPSHOT_THEME.navySoft} 0%, ${SNAPSHOT_THEME.navy} 70%)`,
        borderRadius: 10,
        padding: compact ? "10px 12px" : "14px 16px",
        color: SNAPSHOT_THEME.ink,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace'
      }}
    >
      <a
        href="/dashboard/quotes"
        style={{
          margin: 0,
          fontSize: 8,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
          color: SNAPSHOT_THEME.gold,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4
        }}
      >
        Quote of the Day
      </a>
      <p
        style={{
          margin: compact ? "6px 0 0" : "10px 0 0",
          fontSize: compact ? 11 : 13,
          lineHeight: 1.55,
          fontStyle: "italic",
          color: SNAPSHOT_THEME.ink
        }}
      >
        “{data.quote}”
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontSize: compact ? 10 : 11,
          fontStyle: "normal",
          fontWeight: 600,
          color: SNAPSHOT_THEME.gold
        }}
      >
        {attribution}
      </p>
    </article>
  );
}
