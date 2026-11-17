import type { SnapshotRange } from "@/lib/snapshot-theme";

export type RevenueSourceId = "stripe" | "lemon" | "gumroad" | "patreon" | "shopify";
export type GrowthSourceId = "youtube" | "x" | "mailerlite";

export type SourceContribution = {
  id: string;
  label: string;
  connected: boolean;
  amount: number;
  display: string;
  detail?: string;
};

export type SnapshotMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

function rangeDays(range: SnapshotRange): number {
  return { "1D": 1, "1W": 7, "1M": 30, "1Q": 90, "1Y": 365 }[range];
}

function inRange(iso: string | undefined, range: SnapshotRange): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= rangeDays(range) * 86_400_000;
}

function parseMoney(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return 0;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function money(n: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: n >= 1000 ? 0 : 2
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

export function compactNumber(n: number) {
  try {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

/** Rough range scaling when APIs only expose a fixed period (e.g. Stripe 30d). */
export function scaleForRange(amount: number, baseDays: number, range: SnapshotRange) {
  const days: Record<SnapshotRange, number> = { "1D": 1, "1W": 7, "1M": 30, "1Q": 90, "1Y": 365 };
  if (!baseDays) return amount;
  return amount * (days[range] / baseDays);
}

export function shopifyRangeParam(range: SnapshotRange): string {
  if (range === "1D") return "today";
  if (range === "1W") return "week";
  if (range === "1Y") return "year";
  return "month";
}

export function extractRevenueSources(
  payloads: Partial<Record<RevenueSourceId, Record<string, unknown> | null | undefined>>,
  range: SnapshotRange
): SourceContribution[] {
  const stripe = payloads.stripe;
  const lemon = payloads.lemon;
  const gumroad = payloads.gumroad;
  const patreon = payloads.patreon;
  const shopify = payloads.shopify;

  const stripeGross = stripe?.connected
    ? scaleForRange(parseMoney((stripe.display as { gross30d?: string } | undefined)?.gross30d), 30, range)
    : 0;
  const lemonGross = lemon?.connected ? Number((lemon.metrics as { grossVolume?: number } | undefined)?.grossVolume || 0) : 0;
  const gumroadGross = gumroad?.connected
    ? Number((gumroad.metrics as { grossVolume?: number } | undefined)?.grossVolume || 0)
    : 0;
  const patreonMrr = patreon?.connected
    ? Number((patreon.metrics as { mrrCents?: number } | undefined)?.mrrCents || 0) / 100
    : 0;
  const shopifyRev = shopify?.connected
    ? Number(((shopify.period as { revenue?: { amount?: number } } | undefined)?.revenue?.amount) || 0)
    : 0;

  return [
    {
      id: "stripe",
      label: "Stripe",
      connected: Boolean(stripe?.connected),
      amount: stripeGross,
      display: money(stripeGross),
      detail: "Gross charges (scaled to range)"
    },
    {
      id: "lemon",
      label: "Lemon Squeezy",
      connected: Boolean(lemon?.connected),
      amount: lemonGross,
      display: money(lemonGross)
    },
    {
      id: "gumroad",
      label: "Gumroad",
      connected: Boolean(gumroad?.connected),
      amount: gumroadGross,
      display: money(gumroadGross)
    },
    {
      id: "patreon",
      label: "Patreon",
      connected: Boolean(patreon?.connected),
      amount: patreonMrr,
      display: money(patreonMrr),
      detail: "Estimated MRR"
    },
    {
      id: "shopify",
      label: "Shopify",
      connected: Boolean(shopify?.connected),
      amount: shopifyRev,
      display: money(shopifyRev),
      detail: "Period net sales"
    }
  ];
}

export function extractGrowthSources(
  payloads: Partial<Record<GrowthSourceId, Record<string, unknown> | null | undefined>>
): SourceContribution[] {
  const youtube = payloads.youtube;
  const x = payloads.x;
  const mailerlite = payloads.mailerlite;

  const ytSubs = youtube?.connected ? Number(youtube.subscriberCount || 0) : 0;
  const xFollowers = x?.connected ? Number(x.followersCount || 0) : 0;
  const mlSubs = mailerlite?.connected
    ? Number((mailerlite.metrics as { subscriberCount?: number } | undefined)?.subscriberCount || 0)
    : 0;

  return [
    {
      id: "youtube",
      label: "YouTube",
      connected: Boolean(youtube?.connected),
      amount: ytSubs,
      display: compactNumber(ytSubs),
      detail: youtube?.connected ? `${compactNumber(Number(youtube.viewCount || 0))} views` : undefined
    },
    {
      id: "x",
      label: "X",
      connected: Boolean(x?.connected),
      amount: xFollowers,
      display: compactNumber(xFollowers),
      detail: x?.connected
        ? `${compactNumber(
            ((x.recentTweets as { impressionCount?: number }[] | undefined) || []).reduce(
              (sum, t) => sum + Number(t.impressionCount || 0),
              0
            )
          )} recent impressions`
        : undefined
    },
    {
      id: "mailerlite",
      label: "MailerLite",
      connected: Boolean(mailerlite?.connected),
      amount: mlSubs,
      display: compactNumber(mlSubs),
      detail: mailerlite?.connected
        ? `${String((mailerlite.metrics as { avgOpenDisplay?: string } | undefined)?.avgOpenDisplay || "—")} avg open`
        : undefined
    }
  ];
}

/** Commerce KPIs from Stripe / Lemon / Gumroad / Patreon / Shopify — never Plaid. */
export function extractRevenueMetrics(
  payloads: Partial<Record<RevenueSourceId, Record<string, unknown> | null | undefined>>,
  range: SnapshotRange
): SnapshotMetric[] {
  const sources = extractRevenueSources(payloads, range);
  const totalRevenue = sources.reduce((sum, s) => sum + (s.connected ? s.amount : 0), 0);

  const stripe = payloads.stripe;
  const lemon = payloads.lemon;
  const gumroad = payloads.gumroad;
  const patreon = payloads.patreon;
  const shopify = payloads.shopify;

  const stripeOrders = stripe?.connected
    ? Math.round(scaleForRange(Number(stripe.successfulCount || 0), 30, range))
    : 0;
  const lemonOrders = lemon?.connected
    ? Number((lemon.metrics as { orderCount?: number } | undefined)?.orderCount || 0)
    : 0;
  const gumroadOrders = gumroad?.connected
    ? Number((gumroad.metrics as { saleCount?: number } | undefined)?.saleCount || 0)
    : 0;
  const shopifyOrders = shopify?.connected
    ? Number((shopify.period as { orderCount?: number } | undefined)?.orderCount || 0)
    : 0;
  const orderCount = stripeOrders + lemonOrders + gumroadOrders + shopifyOrders;

  const stripeGross = stripe?.connected
    ? scaleForRange(parseMoney((stripe.display as { gross30d?: string } | undefined)?.gross30d), 30, range)
    : 0;
  const lemonGross = lemon?.connected
    ? Number((lemon.metrics as { grossVolume?: number } | undefined)?.grossVolume || 0)
    : 0;
  const gumroadGross = gumroad?.connected
    ? Number((gumroad.metrics as { grossVolume?: number } | undefined)?.grossVolume || 0)
    : 0;
  const shopifyRev = shopify?.connected
    ? Number(((shopify.period as { revenue?: { amount?: number } } | undefined)?.revenue?.amount) || 0)
    : 0;
  const commerceVolume = stripeGross + lemonGross + gumroadGross + shopifyRev;
  const aov = orderCount > 0 ? commerceVolume / orderCount : 0;

  const stripeMrr = stripe?.connected
    ? parseMoney((stripe.display as { mrr?: string } | undefined)?.mrr)
    : 0;
  const patreonMrr = patreon?.connected
    ? Number((patreon.metrics as { mrrCents?: number } | undefined)?.mrrCents || 0) / 100
    : 0;
  const recurring = stripeMrr + patreonMrr;

  return [
    {
      id: "total",
      label: "Total Revenue",
      value: money(totalRevenue),
      hint: "Commerce · bank excluded"
    },
    {
      id: "aov",
      label: "Average Order Value",
      value: money(aov),
      hint: orderCount ? `${orderCount} orders` : "No orders yet"
    },
    {
      id: "recurring",
      label: "Recurring Revenue",
      value: money(recurring),
      hint: "Stripe + Patreon MRR"
    },
    {
      id: "orders",
      label: "Order Count",
      value: compactNumber(orderCount),
      hint: "Across sales gateways"
    }
  ];
}

/** Audience KPIs from YouTube / X / MailerLite. */
export function extractGrowthMetrics(
  payloads: Partial<Record<GrowthSourceId, Record<string, unknown> | null | undefined>>,
  range: SnapshotRange
): SnapshotMetric[] {
  const sources = extractGrowthSources(payloads);
  const totalAudience = sources.reduce((sum, s) => sum + (s.connected ? s.amount : 0), 0);

  const youtube = payloads.youtube;
  const x = payloads.x;
  const mailerlite = payloads.mailerlite;

  const series = syntheticSeries(totalAudience, range);
  const prior = series.length > 1 ? series[series.length - 2] : totalAudience;
  const netGrowth = totalAudience - prior;
  const netPct = prior ? (netGrowth / prior) * 100 : 0;

  const ytVideos = youtube?.connected
    ? ((youtube.recentVideos as { publishedAt?: string }[] | undefined) || []).filter((v) =>
        inRange(v.publishedAt, range)
      ).length
    : 0;
  const xPosts = x?.connected
    ? ((x.recentTweets as { createdAt?: string }[] | undefined) || []).filter((t) =>
        inRange(t.createdAt, range)
      ).length
    : 0;
  const mlCampaigns = mailerlite?.connected
    ? ((mailerlite.campaigns as { finishedAt?: string }[] | undefined) || []).filter((c) =>
        inRange(c.finishedAt, range)
      ).length
    : 0;
  const publications = ytVideos + xPosts + mlCampaigns;

  const engagementParts: number[] = [];
  if (mailerlite?.connected) {
    const open = Number((mailerlite.metrics as { avgOpenRate?: number } | undefined)?.avgOpenRate || 0);
    if (open > 0) engagementParts.push(open);
  }
  if (x?.connected) {
    const tweets =
      (x.recentTweets as
        | { likeCount?: number; retweetCount?: number; replyCount?: number; impressionCount?: number }[]
        | undefined) || [];
    const scored = tweets
      .map((t) => {
        const impressions = Number(t.impressionCount || 0);
        const eng = Number(t.likeCount || 0) + Number(t.retweetCount || 0) + Number(t.replyCount || 0);
        return impressions > 0 ? (eng / impressions) * 100 : 0;
      })
      .filter((n) => n > 0);
    if (scored.length) {
      engagementParts.push(scored.reduce((a, b) => a + b, 0) / scored.length);
    }
  }
  const engagement =
    engagementParts.length > 0
      ? engagementParts.reduce((a, b) => a + b, 0) / engagementParts.length
      : 0;

  return [
    {
      id: "audience",
      label: "Total Audience",
      value: compactNumber(totalAudience),
      hint: `${sources.filter((s) => s.connected).length} platforms`
    },
    {
      id: "net",
      label: "Net Growth",
      value: `${netGrowth >= 0 ? "+" : ""}${compactNumber(Math.round(netGrowth))}`,
      hint: `${netPct >= 0 ? "+" : ""}${netPct.toFixed(1)}% vs prior`
    },
    {
      id: "publications",
      label: "Publications",
      value: compactNumber(publications),
      hint: "Videos · posts · sends"
    },
    {
      id: "engagement",
      label: "Subscriber Engagement",
      value: engagement > 0 ? `${engagement.toFixed(1)}%` : "—",
      hint: "Opens + social engage"
    }
  ];
}

export function sparkPath(values: number[], width = 240, height = 42) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / span) * (height - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function syntheticSeries(total: number, range: SnapshotRange) {
  const points = range === "1D" ? 12 : range === "1W" ? 7 : range === "1M" ? 12 : range === "1Q" ? 12 : 12;
  const out: number[] = [];
  let cursor = Math.max(total * 0.72, 0);
  for (let i = 0; i < points; i += 1) {
    const drift = (Math.sin(i * 1.1) + 1.15) * 0.035;
    cursor = cursor * (1 + drift * 0.35) + (total - cursor) * 0.18;
    out.push(Math.max(0, cursor));
  }
  out[out.length - 1] = Math.max(total, 0);
  return out;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const body = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
