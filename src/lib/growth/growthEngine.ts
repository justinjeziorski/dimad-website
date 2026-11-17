import type { GrowthSource, GrowthSummaryMetrics, UnifiedGrowthEvent } from "@/lib/growth/types";
import { pctDelta } from "@/lib/revenue/ledgerEngine";

export function generateMockGrowthEvents(userId = "demo"): UnifiedGrowthEvent[] {
  const now = new Date();
  const rows: UnifiedGrowthEvent[] = [];
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 3);
    const iso = d.toISOString();
    rows.push(
      {
        id: `g_yt_reach_${i}`,
        userId,
        source: "youtube",
        platformLabel: "YouTube Channel",
        metricType: "audience_reach",
        value: 4200 + i * 180,
        previousPeriodValue: 3900 + i * 160,
        date: iso,
        metadata: { contentType: "video", campaignName: "Long-form upload" }
      },
      {
        id: `g_yt_follow_${i}`,
        userId,
        source: "youtube",
        platformLabel: "YouTube Channel",
        metricType: "follower_growth",
        value: 35 + (i % 5) * 8,
        previousPeriodValue: 28 + (i % 4) * 6,
        date: iso
      },
      {
        id: `g_yt_out_${i}`,
        userId,
        source: "youtube",
        platformLabel: "YouTube Channel",
        metricType: "content_output",
        value: i % 2 === 0 ? 1 : 0,
        previousPeriodValue: 1,
        date: iso,
        metadata: { contentType: "video" }
      },
      {
        id: `g_x_reach_${i}`,
        userId,
        source: "x",
        platformLabel: "X",
        metricType: "audience_reach",
        value: 1800 + i * 90,
        previousPeriodValue: 1600 + i * 70,
        date: iso,
        metadata: { contentType: "post" }
      },
      {
        id: `g_x_eng_${i}`,
        userId,
        source: "x",
        platformLabel: "X",
        metricType: "engagement_rate",
        value: 2.4 + (i % 6) * 0.35,
        previousPeriodValue: 2.1 + (i % 5) * 0.3,
        date: iso
      },
      {
        id: `g_ml_eng_${i}`,
        userId,
        source: "mailerlite",
        platformLabel: "MailerLite Newsletter",
        metricType: "engagement_rate",
        value: 38 + (i % 4) * 1.5,
        previousPeriodValue: 36 + (i % 3) * 1.2,
        date: iso,
        metadata: { contentType: "newsletter", campaignName: `Weekly Brief #${40 - i}` }
      },
      {
        id: `g_ml_follow_${i}`,
        userId,
        source: "mailerlite",
        platformLabel: "MailerLite Newsletter",
        metricType: "follower_growth",
        value: 22 + (i % 7) * 3,
        previousPeriodValue: 18 + (i % 6) * 2,
        date: iso
      },
      {
        id: `g_ml_out_${i}`,
        userId,
        source: "mailerlite",
        platformLabel: "MailerLite Newsletter",
        metricType: "content_output",
        value: i % 3 === 0 ? 1 : 0,
        previousPeriodValue: 1,
        date: iso,
        metadata: { contentType: "newsletter" }
      }
    );
  }
  return rows;
}

export function summarizeGrowth(
  events: UnifiedGrowthEvent[],
  sources?: Set<GrowthSource>
): GrowthSummaryMetrics {
  const rows = sources?.size ? events.filter((e) => sources.has(e.source)) : events;
  const pick = (type: UnifiedGrowthEvent["metricType"]) => rows.filter((e) => e.metricType === type);

  const reach = pick("audience_reach");
  const followers = pick("follower_growth");
  const output = pick("content_output");
  const engagement = pick("engagement_rate");

  const sum = (list: UnifiedGrowthEvent[]) => list.reduce((a, e) => a + e.value, 0);
  const sumPrev = (list: UnifiedGrowthEvent[]) =>
    list.reduce((a, e) => a + Number(e.previousPeriodValue || 0), 0);
  const avg = (list: UnifiedGrowthEvent[]) => (list.length ? sum(list) / list.length : 0);
  const avgPrev = (list: UnifiedGrowthEvent[]) =>
    list.length ? sumPrev(list) / list.length : 0;

  const totalAudienceReach = sum(reach);
  const netFollowerVelocity = sum(followers);
  const contentOutputCadence = sum(output);
  const averageEngagementRate = avg(engagement);

  return {
    totalAudienceReach,
    reachDeltaPct: pctDelta(totalAudienceReach, sumPrev(reach)) ?? 0,
    netFollowerVelocity,
    followerVelocityDeltaPct: pctDelta(netFollowerVelocity, sumPrev(followers)) ?? 0,
    contentOutputCadence,
    outputCadenceDeltaPct: pctDelta(contentOutputCadence, sumPrev(output)) ?? 0,
    averageEngagementRate,
    engagementDeltaPct: pctDelta(averageEngagementRate, avgPrev(engagement)) ?? 0
  };
}

export function compactNumber(n: number) {
  try {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}
