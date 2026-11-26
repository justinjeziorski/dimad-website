"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SNAPSHOT_CSS, SNAPSHOT_RANGES, type SnapshotRange } from "@/lib/snapshots/theme";
import type { SnapshotMetric, SourceContribution } from "@/lib/snapshots/aggregate";
import { applyDocumentTheme, resolveThemeFromLocation } from "@/lib/theme/bootstrap";

type Accent = "revenue" | "growth";

type Props = {
  kicker: string;
  title: string;
  metrics: SnapshotMetric[];
  range: SnapshotRange;
  onRange: (range: SnapshotRange) => void;
  sources: SourceContribution[];
  /** First paint / no data yet — skeletons inside data slots only. */
  loading?: boolean;
  /** Soft refresh while keeping previous metrics visible (no layout swap). */
  refreshing?: boolean;
  workspaceLabel: string;
  onOpenWorkspace: () => void;
  onOpenIntegrations: () => void;
  /** Visual accent family for sparkline / progress rings. */
  accent?: Accent;
  /** When true, card chrome is provided by the parent bento shell. */
  embedded?: boolean;
};

function MetricSkeleton() {
  return (
    <div className="dimad-snap-metric dimad-snap-skel" aria-hidden>
      <div className="dimad-snap-skel-line dimad-snap-skel-label" />
      <div className="dimad-snap-skel-line dimad-snap-skel-value" />
      <div className="dimad-snap-skel-line dimad-snap-skel-hint" />
    </div>
  );
}

function RevenueSparkline() {
  return (
    <svg className="dimad-snap-spark" viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="dimad-rev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 28 C24 26, 36 18, 56 20 C76 22, 88 12, 112 14 C136 16, 148 8, 172 12 C196 16, 208 6, 240 10 L240 40 L0 40 Z"
        fill="url(#dimad-rev-fill)"
      />
      <path
        d="M0 28 C24 26, 36 18, 56 20 C76 22, 88 12, 112 14 C136 16, 148 8, 172 12 C196 16, 208 6, 240 10"
        fill="none"
        stroke="var(--accent-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GrowthAccentBars() {
  const bars = [
    { color: "var(--accent-gold)", w: "72%" },
    { color: "#34d399", w: "54%" },
    { color: "#38bdf8", w: "63%" },
    { color: "#a78bfa", w: "41%" }
  ];
  return (
    <div className="dimad-snap-growth-bars" aria-hidden>
      {bars.map((bar, i) => (
        <div key={i} className="dimad-snap-growth-track">
          <div className="dimad-snap-growth-fill" style={{ width: bar.w, background: bar.color }} />
        </div>
      ))}
    </div>
  );
}

export default function SnapshotChrome({
  kicker,
  title,
  metrics,
  range,
  onRange,
  sources,
  loading = false,
  refreshing = false,
  workspaceLabel,
  onOpenWorkspace,
  onOpenIntegrations,
  accent = "revenue",
  embedded = false
}: Props) {
  const [openConnected, setOpenConnected] = useState(false);
  const connectedId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const connected = sources.filter((s) => s.connected);
  const isEmpty = !loading && connected.length === 0;
  const showSkeletons = loading && metrics.length === 0;

  useEffect(() => {
    try {
      applyDocumentTheme(resolveThemeFromLocation());
    } catch {
      /* ignore */
    }
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpenConnected(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className={`dimad-snap-card-wrap${embedded ? " dimad-snap-embedded" : ""}`} ref={wrapRef}>
      <style>{SNAPSHOT_CSS}</style>
      <article className={`dimad-snap${embedded ? " dimad-snap--flush" : ""}`} aria-busy={loading || refreshing}>
        <div className="dimad-snap-head">
          {embedded ? (
            <p className="dimad-snap-title" style={{ margin: 0 }}>
              {title}
            </p>
          ) : (
            <div>
              <p className="dimad-snap-kicker">
                {kicker}
                {accent === "revenue" ? (
                  <span className="dimad-snap-live" title="Live connection">
                    <span className="dimad-snap-live-dot" />
                  </span>
                ) : null}
              </p>
              <h2 className="dimad-snap-title">{title}</h2>
            </div>
          )}
          <div className="dimad-snap-actions">
            <div className="dimad-snap-ranges" role="tablist" aria-label="Time range">
              {SNAPSHOT_RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`dimad-snap-range ${range === item ? "active" : ""}`}
                  onClick={() => onRange(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            {!isEmpty ? (
              <button
                type="button"
                className="dimad-snap-integrations"
                title="Manage integrations"
                onClick={onOpenIntegrations}
              >
                Integrations
              </button>
            ) : null}
          </div>
        </div>

        {isEmpty ? (
          <div className="dimad-snap-empty-wrap">
            {accent === "growth" ? <GrowthAccentBars /> : <RevenueSparkline />}
            <p className="dimad-snap-empty-copy">No integrations connected</p>
            <button type="button" className="dimad-snap-cta" onClick={onOpenIntegrations}>
              Set Up Integrations
            </button>
          </div>
        ) : (
          <>
            <div className={`dimad-snap-grid${refreshing ? " dimad-snap-refreshing" : ""}`}>
              {showSkeletons
                ? [0, 1, 2, 3].map((i) => <MetricSkeleton key={i} />)
                : metrics.map((metric) => (
                    <div className="dimad-snap-metric" key={metric.id}>
                      <p className="dimad-snap-metric-label">{metric.label}</p>
                      <p className="dimad-snap-metric-value">{metric.value}</p>
                      {metric.hint ? <p className="dimad-snap-metric-hint">{metric.hint}</p> : null}
                    </div>
                  ))}
            </div>
            {accent === "revenue" ? <RevenueSparkline /> : <GrowthAccentBars />}
            <div className="dimad-snap-foot">
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="dimad-snap-connected"
                  aria-expanded={openConnected}
                  aria-controls={connectedId}
                  onClick={() => setOpenConnected((v) => !v)}
                >
                  Connected · {connected.length}
                </button>
                {openConnected ? (
                  <div className="dimad-snap-connected-menu" id={connectedId}>
                    {connected.map((s) => (
                      <div className="dimad-snap-connected-row" key={s.id}>
                        <span>{s.label}</span>
                        <span className="dimad-snap-check">✓</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button type="button" className="dimad-snap-link" onClick={onOpenWorkspace}>
                {workspaceLabel} →
              </button>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
