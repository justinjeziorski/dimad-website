"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TimeRangeSelector from "@/components/shared/TimeRangeSelector";
import { authFetch } from "@/lib/auth/client";
import { compactNumber, generateMockGrowthEvents, summarizeGrowth } from "@/lib/growth/growthEngine";
import type { GrowthSource, UnifiedGrowthEvent } from "@/lib/growth/types";
import { formatDelta } from "@/lib/revenue/ledgerEngine";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";
import {
  filterDataByTimeframe,
  type CustomDateRange,
  type DimadTimeframe
} from "@/lib/utils/timeframeFilter";

const SOURCES: { id: GrowthSource; label: string }[] = [
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
  { id: "mailerlite", label: "MailerLite" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "manual", label: "Manual" }
];

const GROWTH_CACHE_KEY = "dimad_growth_events_v1";
const STRUCTURAL_GROWTH = generateMockGrowthEvents("demo", new Date("2025-06-15T12:00:00.000Z"));

function readGrowthCache(): UnifiedGrowthEvent[] | null {
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

function writeGrowthCache(events: UnifiedGrowthEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GROWTH_CACHE_KEY, JSON.stringify({ events, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export default function GrowthWorkspacePage() {
  const [events, setEvents] = useState<UnifiedGrowthEvent[]>(STRUCTURAL_GROWTH);
  const [syncing, setSyncing] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [sources, setSources] = useState<Set<GrowthSource>>(new Set(["youtube", "x", "mailerlite"]));
  const [timeframe, setTimeframe] = useState<DimadTimeframe>("30D");
  const [customRange, setCustomRange] = useState<CustomDateRange>({
    startDate: "1970-01-01",
    endDate: "1970-01-30"
  });

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 29);
    setCustomRange({
      startDate: from.toISOString().slice(0, 10),
      endDate: to.toISOString().slice(0, 10)
    });
    const cached = readGrowthCache();
    if (cached?.length) {
      setEvents(cached);
      setUsingMock(false);
    }
  }, []);

  const load = useCallback(async () => {
    setSyncing(true);
    try {
      const [youtube, x, mailerlite] = await Promise.all([
        authFetch("/api/youtube/data", {}, { tokenWaitMs: 2500 }),
        authFetch("/api/x/data", {}, { tokenWaitMs: 2500 }),
        authFetch("/api/mailerlite/data", {}, { tokenWaitMs: 2500 })
      ]);
      const live: UnifiedGrowthEvent[] = [];
      const yt = youtube.data as Record<string, unknown>;
      const xp = x.data as Record<string, unknown>;
      const ml = mailerlite.data as Record<string, unknown>;
      const now = new Date().toISOString();

      if (yt.connected) {
        live.push(
          {
            id: "live_yt_aud",
            userId: "user",
            source: "youtube",
            platformLabel: "YouTube Channel",
            metricType: "audience_reach",
            value: Number(yt.viewCount || 0),
            date: now,
            metadata: { contentType: "video" }
          },
          {
            id: "live_yt_fol",
            userId: "user",
            source: "youtube",
            platformLabel: "YouTube Channel",
            metricType: "follower_growth",
            value: Number(yt.subscriberCount || 0),
            date: now
          },
          {
            id: "live_yt_out",
            userId: "user",
            source: "youtube",
            platformLabel: "YouTube Channel",
            metricType: "content_output",
            value: Number(yt.videoCount || 0),
            date: now,
            metadata: { contentType: "video" }
          }
        );
      }
      if (xp.connected) {
        const impressions = ((xp.recentTweets as { impressionCount?: number }[] | undefined) || []).reduce(
          (sum, t) => sum + Number(t.impressionCount || 0),
          0
        );
        live.push(
          {
            id: "live_x_aud",
            userId: "user",
            source: "x",
            platformLabel: "X",
            metricType: "audience_reach",
            value: impressions || Number(xp.followersCount || 0),
            date: now,
            metadata: { contentType: "post" }
          },
          {
            id: "live_x_fol",
            userId: "user",
            source: "x",
            platformLabel: "X",
            metricType: "follower_growth",
            value: Number(xp.followersCount || 0),
            date: now
          }
        );
      }
      if (ml.connected) {
        const metrics = (ml.metrics || {}) as { subscriberCount?: number; avgOpenRate?: number };
        live.push(
          {
            id: "live_ml_fol",
            userId: "user",
            source: "mailerlite",
            platformLabel: "MailerLite Newsletter",
            metricType: "follower_growth",
            value: Number(metrics.subscriberCount || 0),
            date: now
          },
          {
            id: "live_ml_eng",
            userId: "user",
            source: "mailerlite",
            platformLabel: "MailerLite Newsletter",
            metricType: "engagement_rate",
            value: Number(metrics.avgOpenRate || 0),
            date: now,
            metadata: { contentType: "newsletter" }
          }
        );
      }

      if (live.length) {
        setEvents(live);
        setUsingMock(false);
        writeGrowthCache(live);
      } else if (!readGrowthCache()?.length) {
        setEvents(STRUCTURAL_GROWTH);
        setUsingMock(true);
      }
    } catch {
      if (!readGrowthCache()?.length) {
        setEvents(STRUCTURAL_GROWTH);
        setUsingMock(true);
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  // Deferred background sync after first paint.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 50);
    return () => window.clearTimeout(handle);
  }, [load]);

  const ranged = useMemo(
    () => filterDataByTimeframe(events, timeframe, customRange),
    [events, timeframe, customRange]
  );
  const summary = useMemo(() => summarizeGrowth(ranged, sources), [ranged, sources]);
  const visible = useMemo(
    () => ranged.filter((e) => sources.has(e.source)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [ranged, sources]
  );

  function toggle(id: GrowthSource) {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <DashboardShell
      kicker="Acquisition"
      title="Growth Command Center"
      subtitle="Unified audience events across YouTube, X, MailerLite, and future channels — same metric model for every platform."
      actions={
        syncing ? (
          <span style={{ fontSize: 10, color: SNAPSHOT_THEME.mute, fontWeight: 700, letterSpacing: "0.08em" }}>
            SYNCING LATEST DATA…
          </span>
        ) : null
      }
    >
      {usingMock ? (
        <p style={{ margin: "0 0 12px", color: SNAPSHOT_THEME.mute, fontSize: 11 }}>
          Demo growth events active — connect YouTube, X, or MailerLite to replace mock series.
        </p>
      ) : null}

      <section style={panelStyle}>
        <p style={labelStyle}>Time range</p>
        <TimeRangeSelector
          value={timeframe}
          customRange={customRange}
          onChange={setTimeframe}
          onCustomRangeChange={setCustomRange}
        />
      </section>

      <section style={{ ...panelStyle, marginTop: 12 }}>
        <p style={labelStyle}>Sources</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SOURCES.map((s) => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)} style={pill(sources.has(s.id))}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <div style={grid4}>
        <Kpi
          label="Total Audience Reach"
          value={compactNumber(summary.totalAudienceReach)}
          delta={summary.reachDeltaPct}
        />
        <Kpi
          label="Net Follower Velocity"
          value={compactNumber(summary.netFollowerVelocity)}
          delta={summary.followerVelocityDeltaPct}
        />
        <Kpi
          label="Content Output Cadence"
          value={compactNumber(summary.contentOutputCadence)}
          delta={summary.outputCadenceDeltaPct}
        />
        <Kpi
          label="Avg Engagement Rate"
          value={`${summary.averageEngagementRate.toFixed(1)}%`}
          delta={summary.engagementDeltaPct}
        />
      </div>

      <section style={{ ...panelStyle, marginTop: 14 }}>
        <p style={labelStyle}>Unified growth events</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ color: SNAPSHOT_THEME.mute, textAlign: "left" }}>
                {["Date", "Platform", "Metric", "Value", "Campaign / Type"].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.slice(0, 80).map((e) => (
                <tr key={e.id} style={{ borderTop: `1px solid ${SNAPSHOT_THEME.navyLine}` }}>
                  <td style={tdStyle}>{e.date.slice(0, 10)}</td>
                  <td style={tdStyle}>{e.platformLabel}</td>
                  <td style={tdStyle}>{e.metricType.replace(/_/g, " ")}</td>
                  <td style={tdStyle}>
                    {e.metricType === "engagement_rate" ? `${e.value.toFixed(1)}%` : compactNumber(e.value)}
                  </td>
                  <td style={tdStyle}>
                    {e.metadata?.campaignName || e.metadata?.contentType || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: number }) {
  return (
    <div style={panelStyle}>
      <p style={labelStyle}>{label}</p>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: delta >= 0 ? SNAPSHOT_THEME.ok : SNAPSHOT_THEME.danger }}>
        {formatDelta(delta)}
      </p>
    </div>
  );
}

const panelStyle: CSSProperties = {
  background: "rgba(17, 34, 64, 0.72)",
  border: `1px solid ${SNAPSHOT_THEME.navyLine}`,
  borderRadius: 16,
  padding: 16
};

const labelStyle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: SNAPSHOT_THEME.gold,
  fontWeight: 700
};

const grid4: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 14
};

const thStyle: CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const tdStyle: CSSProperties = { padding: "10px 6px", color: SNAPSHOT_THEME.ink };

function pill(active: boolean): CSSProperties {
  return {
    border: `1px solid ${active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.navyLine}`,
    background: active ? SNAPSHOT_THEME.goldSoft : "transparent",
    color: active ? SNAPSHOT_THEME.gold : SNAPSHOT_THEME.mute,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer"
  };
}
