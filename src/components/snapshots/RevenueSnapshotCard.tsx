"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SnapshotChrome from "@/components/snapshots/SnapshotChrome";
import { authFetch } from "@/lib/auth/client";
import {
  extractRevenueMetrics,
  extractRevenueSources,
  shopifyRangeParam,
  type RevenueSourceId
} from "@/lib/snapshots/aggregate";
import { openIntegrationsSettings, openShellTab } from "@/lib/snapshots/nav";
import type { SnapshotRange } from "@/lib/snapshots/theme";
import { takeWorkspaceHydration } from "@/lib/cache/workspace-data-cache";

export default function RevenueSnapshotCard() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<SnapshotRange>("1M");
  const [payloads, setPayloads] = useState<Partial<Record<RevenueSourceId, Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      window.parent.postMessage(
        { type: "dimad-revenue-snapshot-resize", height: Math.ceil(node.getBoundingClientRect().height) },
        window.location.origin
      );
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, range, payloads]);

  const load = useCallback(async (nextRange: SnapshotRange) => {
    setLoading(true);
    const keys: RevenueSourceId[] = ["stripe", "lemon", "gumroad", "patreon", "shopify"];
    const endpoints: Record<RevenueSourceId, string> = {
      stripe: "/api/integrations/stripe/metrics",
      lemon: "/api/lemonsqueezy/data",
      gumroad: "/api/gumroad/data",
      patreon: "/api/patreon/data",
      shopify: `/api/shopify/data?range=${encodeURIComponent(shopifyRangeParam(nextRange))}`
    };

    const next: Partial<Record<RevenueSourceId, Record<string, unknown>>> = {};
    await Promise.all(
      keys.map(async (key) => {
        const cached = takeWorkspaceHydration(key);
        if (cached && key !== "shopify") next[key] = cached;
        try {
          const { data } = await authFetch(endpoints[key]);
          next[key] = data as Record<string, unknown>;
        } catch {
          next[key] = next[key] || { connected: false };
        }
      })
    );
    setPayloads(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const sources = useMemo(() => extractRevenueSources(payloads, range), [payloads, range]);
  const metrics = useMemo(() => extractRevenueMetrics(payloads, range), [payloads, range]);

  return (
    <div ref={rootRef}>
      <SnapshotChrome
        kicker="Revenue"
        title="Consolidated volume"
        metrics={metrics}
        range={range}
        onRange={setRange}
        sources={sources}
        loading={loading}
        workspaceLabel="Open Revenue"
        onOpenWorkspace={() => openShellTab("ent-crm")}
        onOpenIntegrations={openIntegrationsSettings}
      />
    </div>
  );
}
