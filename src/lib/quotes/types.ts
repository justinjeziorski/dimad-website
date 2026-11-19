export type QuoteFields = {
  quote: string;
  author: string;
  context: string;
};

export type DailyQuoteDoc = QuoteFields & {
  date: string;
  createdAt: unknown;
};

export type DailyQuote = QuoteFields & {
  date: string;
  source: "firestore" | "emergency_fallback";
};

export type QuoteImportItem = QuoteFields;

export type ImportQuotesResult = {
  written: string[];
  skipped: string[];
  startDate: string;
};
