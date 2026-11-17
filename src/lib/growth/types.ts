export type GrowthMetricType =
  | "audience_reach"
  | "follower_growth"
  | "content_output"
  | "engagement_rate";

export type GrowthSource = "youtube" | "mailerlite" | "instagram" | "tiktok" | "x" | "manual";

export interface UnifiedGrowthEvent {
  id: string;
  userId: string;
  source: GrowthSource;
  platformLabel: string;
  metricType: GrowthMetricType;
  value: number;
  previousPeriodValue?: number;
  date: string;
  metadata?: {
    campaignName?: string;
    contentType?: "video" | "newsletter" | "post" | "reel";
    url?: string;
  };
}

export interface GrowthSummaryMetrics {
  totalAudienceReach: number;
  reachDeltaPct: number;
  netFollowerVelocity: number;
  followerVelocityDeltaPct: number;
  contentOutputCadence: number;
  outputCadenceDeltaPct: number;
  averageEngagementRate: number;
  engagementDeltaPct: number;
}
