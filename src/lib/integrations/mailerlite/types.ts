export type MailerLiteCampaign = {
  id: string;
  name: string;
  status: string;
  sent: number;
  openRate: number;
  clickRate: number;
  finishedAt: string;
};

export type MailerLitePayload = {
  accountLabel: string;
  connectedAt: string;
  campaigns: MailerLiteCampaign[];
  metrics: {
    subscriberCount: number;
    avgOpenRate: number;
    avgOpenDisplay: string;
    avgClickRate: number;
    avgClickDisplay: string;
    latestCampaignName: string;
  };
};
