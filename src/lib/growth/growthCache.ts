import { generateMockGrowthEvents } from "@/lib/growth/growthEngine";
import type { UnifiedGrowthEvent } from "@/lib/growth/types";

const GROWTH_CACHE_KEY = "dimad_growth_events_v1";

/** Stable demo series used when no live/cached growth events exist. */
export const STRUCTURAL_GROWTH = generateMockGrowthEvents(
  "demo",
  new Date("2025-06-15T12:00:00.000Z")
);

export function readGrowthCache(): UnifiedGrowthEvent[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GROWTH_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { events?: UnifiedGrowthEvent[] };
    return Array.isArray(parsed.events) && parsed.events.length ? parsed.events : null;
  } catch {
    return null;
  }
}

export function writeGrowthCache(events: UnifiedGrowthEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GROWTH_CACHE_KEY, JSON.stringify({ events, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
