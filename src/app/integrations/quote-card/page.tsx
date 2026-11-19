import QuoteOfTheDay from "@/components/quotes/QuoteOfTheDay";

export const dynamic = "force-dynamic";

export default function QuoteCardPage() {
  return (
    <main style={{ margin: 0, padding: 12, background: "transparent", minHeight: "100%" }}>
      <QuoteOfTheDay compact />
    </main>
  );
}
