"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SnapshotChrome from "@/components/snapshots/SnapshotChrome";
import { authFetch } from "@/lib/auth/client";
import {
  extractGrowthMetrics,
  extractGrowthSources,
  type GrowthSourceId
} from "@/lib/snapshots/aggregate";
import { openIntegrationsSettings, openShellTab } from "@/lib/snapshots/nav";
import type { SnapshotRange } from "@/lib/snapshots/theme";
import { takeWorkspaceHydration } from "@/lib/cache/workspace-data-cache";

type Props = {
  embedded?: boolean;
};

export default function GrowthSnapshotCard({ embedded = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasDataRef = useRef(false);
  const [range, setRange] = useState<SnapshotRange>("1M");
  const [payloads, setPayloads] = useState<Partial<Record<GrowthSourceId, Record<string, unknown>>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (embedded) return;
    const node = rootRef.current;
    if (!node || window.parent === window) return;
    const post = () => {
      window.parent.postMessage(
        { type: "dimad-growth-snapshot-resize", height: Math.ceil(node.getBoundingClientRect().height) },
        window.location.origin
      );
    };
    post();
    const observer = new ResizeObserver(post);
    observer.observe(node);
    return () => observer.disconnect();
  }, [embedded, loading, range, payloads]);

  const load = useCallback(async () => {
    const initial = !hasDataRef.current;
    if (initial) setLoading(true);
    else setRefreshing(true);

    const keys: GrowthSourceId[] = ["youtube", "x", "mailerlite"];
    const endpoints: Record<GrowthSourceId, string> = {
      youtube: "/api/youtube/data",
      x: "/api/x/data",
      mailerlite: "/api/mailerlite/data"
    };
    const next: Partial<Record<GrowthSourceId, Record<string, unknown>>> = {};
    await Promise.all(
      keys.map(async (key) => {
        const cached = takeWorkspaceHydration(key);
        if (cached) next[key] = cached;
        try {
          const { data } = await authFetch(endpoints[key]);
          next[key] = data as Record<string, unknown>;
        } catch {
          next[key] = next[key] || { connected: false };
        }
      })
    );
    hasDataRef.current = true;
    setPayloads(next);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load, range]);

  const sources = useMemo(() => extractGrowthSources(payloads), [payloads]);
  const metrics = useMemo(() => extractGrowthMetrics(payloads, range), [payloads, range]);

  return (
    <div ref={rootRef} className="h-full">
      <SnapshotChrome
        kicker="Growth"
        title="Audience Reach"
        metrics={metrics}
        range={range}
        onRange={setRange}
        sources={sources}
        loading={loading}
        refreshing={refreshing}
        accent="growth"
        embedded={embedded}
        workspaceLabel="Open Growth"
        onOpenWorkspace={() => openShellTab("ent-growth")}
        onOpenIntegrations={openIntegrationsSettings}
      />
    </div>
  );
}
