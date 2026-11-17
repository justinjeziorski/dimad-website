import type { UnifiedTransaction } from "@/lib/revenue/types";

function parseMoney(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return 0;
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Best-effort mapping from live integration payloads into the unified ledger. */
export function adaptLivePayloads(
  userId: string,
  payloads: {
    stripe?: Record<string, unknown> | null;
    shopify?: Record<string, unknown> | null;
    gumroad?: Record<string, unknown> | null;
    patreon?: Record<string, unknown> | null;
    lemon?: Record<string, unknown> | null;
    plaid?: Record<string, unknown> | null;
  }
): UnifiedTransaction[] {
  const out: UnifiedTransaction[] = [];
  const now = new Date().toISOString();

  const stripe = payloads.stripe;
  if (stripe?.connected) {
    const gross = parseMoney((stripe.display as { gross30d?: string } | undefined)?.gross30d);
    const mrr = parseMoney((stripe.display as { mrr?: string } | undefined)?.mrr);
    if (gross > 0) {
      out.push({
        id: `live_stripe_gross_${userId}`,
        userId,
        type: "REVENUE",
        source: "stripe",
        platformLabel: "Stripe",
        amount: Math.max(0, gross - mrr),
        feeAmount: gross * 0.029,
        currency: "USD",
        category: "One-Time Sale",
        isRecurring: false,
        merchantOrCustomer: String(stripe.accountLabel || "Stripe"),
        date: now
      });
    }
    if (mrr > 0) {
      out.push({
        id: `live_stripe_mrr_${userId}`,
        userId,
        type: "REVENUE",
        source: "stripe",
        platformLabel: "Stripe",
        amount: mrr,
        feeAmount: mrr * 0.029,
        currency: "USD",
        category: "Subscription",
        isRecurring: true,
        recurringInterval: "monthly",
        merchantOrCustomer: String(stripe.accountLabel || "Stripe"),
        date: now
      });
    }
  }

  const shopify = payloads.shopify;
  if (shopify?.connected) {
    const amount = Number((shopify.period as { revenue?: { amount?: number } } | undefined)?.revenue?.amount || 0);
    if (amount > 0) {
      out.push({
        id: `live_shopify_${userId}`,
        userId,
        type: "REVENUE",
        source: "shopify",
        platformLabel: "Shopify",
        amount,
        feeAmount: amount * 0.029,
        currency: "USD",
        category: "One-Time Sale",
        isRecurring: false,
        merchantOrCustomer: String(shopify.shop || "Shopify"),
        date: now
      });
    }
  }

  const gumroad = payloads.gumroad;
  if (gumroad?.connected) {
    const amount = Number((gumroad.metrics as { grossVolume?: number } | undefined)?.grossVolume || 0);
    if (amount > 0) {
      out.push({
        id: `live_gumroad_${userId}`,
        userId,
        type: "REVENUE",
        source: "gumroad",
        platformLabel: "Gumroad",
        amount,
        feeAmount: amount * 0.087,
        currency: "USD",
        category: "One-Time Sale",
        isRecurring: false,
        date: now
      });
    }
  }

  const lemon = payloads.lemon;
  if (lemon?.connected) {
    const amount = Number((lemon.metrics as { grossVolume?: number } | undefined)?.grossVolume || 0);
    if (amount > 0) {
      out.push({
        id: `live_lemon_${userId}`,
        userId,
        type: "REVENUE",
        source: "lemon_squeezy",
        platformLabel: "Lemon Squeezy",
        amount,
        feeAmount: amount * 0.05,
        currency: "USD",
        category: "One-Time Sale",
        isRecurring: false,
        date: now
      });
    }
  }

  const patreon = payloads.patreon;
  if (patreon?.connected) {
    const mrr = Number((patreon.metrics as { mrrCents?: number } | undefined)?.mrrCents || 0) / 100;
    if (mrr > 0) {
      out.push({
        id: `live_patreon_${userId}`,
        userId,
        type: "REVENUE",
        source: "patreon",
        platformLabel: "Patreon",
        amount: mrr,
        feeAmount: mrr * 0.08,
        currency: "USD",
        category: "Subscription",
        isRecurring: true,
        recurringInterval: "monthly",
        date: now
      });
    }
  }

  const plaid = payloads.plaid;
  if (plaid?.connected) {
    const txs =
      (plaid.recentTransactions as
        | { transactionId?: string; amount?: number; merchantName?: string; date?: string; category?: string }[]
        | undefined) || [];
    for (const tx of txs) {
      const amount = Math.abs(Number(tx.amount || 0));
      if (!amount) continue;
      out.push({
        id: `live_plaid_${tx.transactionId || amount}`,
        userId,
        type: "EXPENSE",
        source: "plaid",
        platformLabel: String(plaid.institutionName || "Plaid"),
        amount,
        currency: "USD",
        category: String(tx.category || "Bank Expense"),
        isRecurring: false,
        merchantOrCustomer: String(tx.merchantName || "Merchant"),
        date: tx.date ? new Date(tx.date).toISOString() : now,
        businessPersonal: "business"
      });
    }
  }

  return out;
}
