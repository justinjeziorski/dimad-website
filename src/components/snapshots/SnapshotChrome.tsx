"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SNAPSHOT_CSS, SNAPSHOT_RANGES, type SnapshotRange } from "@/lib/snapshot-theme";
import type { SnapshotMetric, SourceContribution } from "@/lib/snapshot-aggregate";

type Props = {
  kicker: string;
  title: string;
  metrics: SnapshotMetric[];
  range: SnapshotRange;
  onRange: (range: SnapshotRange) => void;
  sources: SourceContribution[];
  loading?: boolean;
  workspaceLabel: string;
  onOpenWorkspace: () => void;
  onOpenIntegrations: () => void;
};

export default function SnapshotChrome({
  kicker,
  title,
  metrics,
  range,
  onRange,
  sources,
  loading = false,
  workspaceLabel,
  onOpenWorkspace,
  onOpenIntegrations
}: Props) {
  const [openConnected, setOpenConnected] = useState(false);
  const connectedId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const connected = sources.filter((s) => s.connected);
  const isEmpty = !loading && connected.length === 0;

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpenConnected(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="dimad-snap-card-wrap" ref={wrapRef}>
      <style>{SNAPSHOT_CSS}</style>
      <article className="dimad-snap">
        <div className="dimad-snap-head">
          <div>
            <p className="dimad-snap-kicker">{kicker}</p>
            <h2 className="dimad-snap-title">{title}</h2>
          </div>
          {!isEmpty ? (
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
              <button
                type="button"
                className="dimad-snap-integrations"
                title="Manage integrations"
                onClick={onOpenIntegrations}
              >
                Integrations
              </button>
            </div>
          ) : null}
        </div>

        {isEmpty ? (
          <div className="dimad-snap-empty-wrap">
            <p className="dimad-snap-empty-copy">No integrations connected</p>
            <button type="button" className="dimad-snap-cta" onClick={onOpenIntegrations}>
              Set Up Integrations
            </button>
          </div>
        ) : (
          <>
            <div className="dimad-snap-grid" aria-busy={loading}>
              {(loading
                ? [
                    { id: "a", label: "…", value: "…" },
                    { id: "b", label: "…", value: "…" },
                    { id: "c", label: "…", value: "…" },
                    { id: "d", label: "…", value: "…" }
                  ]
                : metrics
              ).map((metric) => (
                <div className="dimad-snap-metric" key={metric.id}>
                  <p className="dimad-snap-metric-label">{metric.label}</p>
                  <p className="dimad-snap-metric-value">{metric.value}</p>
                  {metric.hint ? <p className="dimad-snap-metric-hint">{metric.hint}</p> : null}
                </div>
              ))}
            </div>
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
