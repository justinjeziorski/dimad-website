export type PatreonTier = {
  id: string;
  title: string;
  amountCents: number;
  amountDisplay: string;
  patronCount: number;
};

export type PatreonCampaignPayload = {
  campaignId: string;
  campaignName: string;
  connectedAt: string;
  tiers: PatreonTier[];
  metrics: {
    patronCount: number;
    mrrCents: number;
    mrrDisplay: string;
    tierCount: number;
  };
};
