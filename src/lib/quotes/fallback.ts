import type { QuoteFields } from "./types";

/** Single hardcoded emergency fallback when today's Firestore doc is missing. */
export const EMERGENCY_FALLBACK_QUOTE: QuoteFields = {
  quote:
    'If you want to understand the entrepreneur, study the juvenile delinquent. The delinquent is saying with his actions, "This sucks. I\'m going to do my own thing."',
  author: "Yvon Chouinard",
  context: "Founder of Patagonia"
};
