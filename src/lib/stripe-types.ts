export type StripeMoneyDisplay = {
  available: string;
  pending: string;
  gross30d: string;
  mrr: string;
};

export type StripeRecentPayment = {
  id: string;
  description: string;
  created: number;
  displayAmount: string;
};

export type StripeConnectedMetrics = {
  ok: true;
  connected: true;
  accountLabel: string;
  connectedAt: string;
  livemode: boolean;
  activeSubscriptions: number;
  subscriptionsCapped: boolean;
  successfulCount: number;
  display: StripeMoneyDisplay;
  recent: StripeRecentPayment[];
};

export type StripeMetricsPayload =
  | { ok: true; connected: false }
  | StripeConnectedMetrics
  | { ok: false; error: string };
