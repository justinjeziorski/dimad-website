/** Dimad OS Command Center snapshot palette — semantic tokens (dark default / light editorial). */
export const SNAPSHOT_THEME = {
  navy: "var(--bg-card)",
  navySoft: "var(--bg-nav)",
  navyNested: "var(--bg-nested)",
  navyLine: "var(--border-hairline)",
  gold: "var(--accent-gold)",
  goldHover: "var(--accent-gold-hover)",
  goldSoft: "var(--accent-gold-soft)",
  goldBorder: "var(--accent-gold-border)",
  accent: "var(--accent-sky)",
  ink: "var(--text-primary)",
  mute: "var(--text-secondary)",
  dim: "var(--text-muted)",
  danger: "var(--status-alert)",
  ok: "var(--status-ok)"
} as const;

export const SNAPSHOT_CSS = `
  @keyframes dimad-snap-pulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 0.9; }
  }
  .dimad-snap {
    --snap-navy: var(--bg-card);
    --snap-navy-soft: var(--bg-nav);
    --snap-nested: var(--bg-nested);
    --snap-line: var(--border-hairline);
    --snap-gold: var(--accent-gold);
    --snap-gold-hover: var(--accent-gold-hover);
    --snap-gold-soft: var(--accent-gold-soft);
    --snap-gold-border: var(--accent-gold-border);
    --snap-accent: var(--accent-sky);
    --snap-ink: var(--text-primary);
    --snap-mute: var(--text-secondary);
    --snap-dim: var(--text-muted);
    --snap-danger: var(--status-alert);
    --snap-ok: var(--status-ok);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: var(--snap-ink);
    background: var(--bg-card);
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
  .dimad-snap--flush {
    background: transparent;
    border: 0;
    border-radius: 0;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
  }
  .dimad-snap--flush::before { display: none; }
  .dimad-snap-embedded { height: 100%; }
  .dimad-snap-live {
    display: inline-flex;
    align-items: center;
    margin-left: 6px;
    vertical-align: middle;
  }
  .dimad-snap-live-dot {
    width: 6px; height: 6px; border-radius: 999px;
    background: #34d399;
    box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.18);
    animation: dimad-snap-pulse 1.8s ease-in-out infinite;
  }
  .dimad-snap-skel-line {
    border-radius: 6px;
    background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(245,185,66,0.12), rgba(255,255,255,0.04));
    background-size: 200% 100%;
    animation: dimad-snap-pulse 1.4s ease-in-out infinite;
  }
  .dimad-snap-skel-label { height: 8px; width: 42%; margin-bottom: 8px; }
  .dimad-snap-skel-value { height: 16px; width: 68%; margin-bottom: 6px; }
  .dimad-snap-skel-hint { height: 8px; width: 34%; }
  .dimad-snap-refreshing { opacity: 0.82; transition: opacity 160ms ease; }
  .dimad-snap-spark {
    display: block; width: 100%; height: 36px; margin: 0 0 8px;
  }
  .dimad-snap-growth-bars {
    display: grid; gap: 5px; margin: 0 0 8px;
  }
  .dimad-snap-growth-track {
    height: 5px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden;
  }
  .dimad-snap-growth-fill {
    height: 100%; border-radius: 999px; opacity: 0.85;
  }
  html[data-theme="light"] .dimad-snap-card-wrap,
  html[data-theme="light"] .dimad-snap,
  :root[data-theme="light"] .dimad-snap-card-wrap,
  :root[data-theme="light"] .dimad-snap {
    background: #e8ecf2 !important;
    box-shadow: none;
  }
  html[data-theme="light"] .dimad-snap-metric,
  html[data-theme="light"] .dimad-snap-ranges,
  html[data-theme="light"] .dimad-snap-connected-menu,
  :root[data-theme="light"] .dimad-snap-metric,
  :root[data-theme="light"] .dimad-snap-ranges,
  :root[data-theme="light"] .dimad-snap-connected-menu {
    background: #ffffff !important;
  }
  .dimad-snap::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse 80% 60% at 90% -10%, var(--accent-gold-soft), transparent 55%);
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
    border: 1px solid var(--snap-line);
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
    padding: 6px 8px; box-shadow: var(--shadow-elevated);
  }
  .dimad-snap-connected-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    font-size: 10px; padding: 4px 0; border-bottom: 1px solid var(--snap-line);
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
    background: radial-gradient(ellipse 70% 70% at 50% 40%, var(--accent-gold-soft), transparent 70%);
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
