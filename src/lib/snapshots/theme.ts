/** Dimad OS Command Center snapshot palette — obsidian navy + warm gold */
export const SNAPSHOT_THEME = {
  navy: "#0c1220",
  navySoft: "#10182a",
  navyNested: "#080c16",
  navyLine: "rgba(255, 255, 255, 0.06)",
  gold: "#f5b942",
  goldHover: "#fbbf24",
  goldSoft: "rgba(245, 185, 66, 0.12)",
  goldBorder: "rgba(245, 185, 66, 0.35)",
  accent: "#38bdf8",
  ink: "#f1f5f9",
  mute: "#94a3b8",
  dim: "#64748b",
  danger: "#fb7185",
  ok: "#34d399"
} as const;

export const SNAPSHOT_CSS = `
  .dimad-snap {
    --snap-navy: ${SNAPSHOT_THEME.navy};
    --snap-navy-soft: ${SNAPSHOT_THEME.navySoft};
    --snap-nested: ${SNAPSHOT_THEME.navyNested};
    --snap-line: ${SNAPSHOT_THEME.navyLine};
    --snap-gold: ${SNAPSHOT_THEME.gold};
    --snap-gold-hover: ${SNAPSHOT_THEME.goldHover};
    --snap-gold-soft: ${SNAPSHOT_THEME.goldSoft};
    --snap-gold-border: ${SNAPSHOT_THEME.goldBorder};
    --snap-accent: ${SNAPSHOT_THEME.accent};
    --snap-ink: ${SNAPSHOT_THEME.ink};
    --snap-mute: ${SNAPSHOT_THEME.mute};
    --snap-dim: ${SNAPSHOT_THEME.dim};
    --snap-danger: ${SNAPSHOT_THEME.danger};
    --snap-ok: ${SNAPSHOT_THEME.ok};
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: var(--snap-ink);
    background: rgba(12, 18, 32, 0.92);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--snap-line);
    border-radius: 12px;
    padding: 12px 14px 14px;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
  .dimad-snap::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse 80% 60% at 90% -10%, rgba(245, 185, 66, 0.08), transparent 55%);
    border-radius: inherit;
  }
  .dimad-snap * { box-sizing: border-box; position: relative; }
  .dimad-snap-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .dimad-snap-kicker {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 10px;
    letter-spacing: 0.025em;
    text-transform: none;
    color: var(--snap-ink);
    font-weight: 600;
  }
  .dimad-snap-title {
    margin: 2px 0 0;
    font-size: 11px;
    font-weight: 500;
    color: var(--snap-mute);
    white-space: nowrap;
  }
  .dimad-snap-actions {
    display: flex; align-items: center; gap: 5px; position: relative;
    flex-wrap: nowrap; justify-content: flex-end; flex-shrink: 0;
  }
  .dimad-snap-integrations {
    height: 22px; border-radius: 999px;
    border: 1px solid var(--snap-line);
    background: transparent; color: var(--snap-mute);
    font-size: 9px; font-weight: 700; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0 8px; letter-spacing: 0.03em; white-space: nowrap;
  }
  .dimad-snap-integrations:hover {
    color: var(--snap-gold); border-color: var(--snap-gold-border);
  }
  .dimad-snap-ranges {
    display: inline-flex; gap: 2px; padding: 2px;
    border: 1px solid var(--snap-line); border-radius: 999px;
    background: var(--snap-nested);
  }
  .dimad-snap-range {
    border: 0; background: transparent; color: var(--snap-mute);
    font: inherit; font-size: 9px; font-weight: 700;
    letter-spacing: 0.02em; padding: 3px 6px; border-radius: 999px; cursor: pointer;
  }
  .dimad-snap-range.active {
    background: var(--snap-gold-soft); color: var(--snap-gold);
    box-shadow: inset 0 0 0 1px var(--snap-gold-border);
  }
  .dimad-snap-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
    margin: 0 0 8px;
  }
  .dimad-snap-metric {
    background: var(--snap-nested);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 10px;
    padding: 8px 10px 7px;
    min-height: 0;
  }
  .dimad-snap-metric-label {
    margin: 0;
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--snap-dim);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dimad-snap-metric-value {
    margin: 4px 0 0;
    font-size: 15px;
    line-height: 1.1;
    font-weight: 700;
    color: var(--snap-ink);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
  }
  .dimad-snap-metric-hint {
    margin: 2px 0 0;
    font-size: 8px;
    color: var(--snap-mute);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dimad-snap-foot {
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    border-top: 1px solid var(--snap-line); padding-top: 8px; margin-top: 2px;
    position: relative;
  }
  .dimad-snap-connected {
    border: 1px solid var(--snap-line);
    background: transparent;
    color: var(--snap-ok);
    font: inherit;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 4px 8px;
    cursor: pointer;
  }
  .dimad-snap-connected:hover { color: var(--snap-gold); border-color: var(--snap-gold-border); }
  .dimad-snap-connected-menu {
    position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 22;
    min-width: 180px; max-width: 240px;
    background: var(--snap-nested); border: 1px solid var(--snap-line); border-radius: 10px;
    padding: 6px 8px; box-shadow: 0 18px 40px rgba(0,0,0,0.45);
  }
  .dimad-snap-connected-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    font-size: 10px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .dimad-snap-connected-row:last-child { border-bottom: 0; }
  .dimad-snap-check { color: var(--snap-ok); font-weight: 700; }
  .dimad-snap-link {
    border: 0; background: transparent; color: var(--snap-gold);
    font: inherit; font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; cursor: pointer; padding: 0; white-space: nowrap;
  }
  .dimad-snap-link:hover { color: var(--snap-gold-hover); text-decoration: underline; }
  .dimad-snap-empty-wrap {
    display: grid; place-items: center; text-align: center;
    min-height: 132px; padding: 10px 8px 4px;
    background: radial-gradient(ellipse 70% 70% at 50% 40%, rgba(245, 185, 66, 0.08), transparent 70%);
    border-radius: 10px;
  }
  .dimad-snap-empty-copy {
    margin: 0 0 12px; color: var(--snap-mute); font-size: 12px; line-height: 1.4;
  }
  .dimad-snap-cta {
    border: 1px solid var(--snap-gold-border);
    background: transparent;
    color: var(--snap-gold);
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 8px 14px;
    cursor: pointer;
  }
  .dimad-snap-cta:hover { background: var(--snap-gold-soft); border-color: var(--snap-gold); color: var(--snap-gold-hover); }
  .dimad-snap-card-wrap { position: relative; height: 100%; }
`;

export type SnapshotRange = "1D" | "1W" | "1M" | "1Y";
export const SNAPSHOT_RANGES: SnapshotRange[] = ["1D", "1W", "1M", "1Y"];
