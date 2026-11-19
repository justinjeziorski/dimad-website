import type { QuoteFields } from "./types";

/** Single hardcoded emergency fallback when today's Firestore doc is missing. */
export const EMERGENCY_FALLBACK_QUOTE: QuoteFields = {
  quote: "Remember, today is the tomorrow you worried about yesterday.",
  author: "Dale Carnegie",
  context: "Author of How To Win Friends and Influence People"
};
