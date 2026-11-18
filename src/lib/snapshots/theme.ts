/** Scandinavian Command Center snapshot palette */
export const SNAPSHOT_THEME = {
  navy: "#0A192F",
  navySoft: "#112240",
  navyLine: "rgba(212, 175, 55, 0.22)",
  gold: "#D4AF37",
  goldSoft: "rgba(212, 175, 55, 0.14)",
  ink: "#E8EEF7",
  mute: "#8BA0B8",
  danger: "#E57373",
  ok: "#7DCEA0"
} as const;

export const SNAPSHOT_CSS = `
  .dimad-snap {
    --snap-navy: ${SNAPSHOT_THEME.navy};
    --snap-navy-soft: ${SNAPSHOT_THEME.navySoft};
    --snap-line: ${SNAPSHOT_THEME.navyLine};
    --snap-gold: ${SNAPSHOT_THEME.gold};
    --snap-gold-soft: ${SNAPSHOT_THEME.goldSoft};
    --snap-ink: ${SNAPSHOT_THEME.ink};
    --snap-mute: ${SNAPSHOT_THEME.mute};
    --snap-danger: ${SNAPSHOT_THEME.danger};
    --snap-ok: ${SNAPSHOT_THEME.ok};
    font-family: "JetBrains Mono", ui-monospace, monospace;
    color: var(--snap-ink);
    background: linear-gradient(165deg, var(--snap-navy-soft) 0%, var(--snap-navy) 55%, #07101f 100%);
    border: 1px solid var(--snap-line);
    border-radius: 14px;
    padding: 10px 12px 8px;
    box-sizing: border-box;
    height: 100%;
    overflow: hidden;
  }
  .dimad-snap * { box-sizing: border-box; }
  .dimad-snap-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }
  .dimad-snap-kicker {
    margin: 0;
    font-size: 8px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--snap-gold);
    font-weight: 700;
  }
  .dimad-snap-title {
    margin: 2px 0 0;
    font-size: 11px;
    font-weight: 600;
    color: var(--snap-ink);
    white-space: nowrap;
  }
  .dimad-snap-actions {
    display: flex; align-items: center; gap: 5px; position: relative;
    flex-wrap: nowrap; justify-content: flex-end; flex-shrink: 0;
  }
  .dimad-snap-integrations {
    height: 20px; border-radius: 999px;
    border: 1px solid var(--snap-line);
    background: transparent; color: var(--snap-mute);
    font-size: 9px; font-weight: 700; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0 7px; letter-spacing: 0.03em; white-space: nowrap;
  }
  .dimad-snap-integrations:hover {
    color: var(--snap-gold); border-color: var(--snap-gold);
  }
  .dimad-snap-ranges {
    display: inline-flex; gap: 2px; padding: 2px;
    border: 1px solid var(--snap-line); border-radius: 999px;
    background: rgba(7, 16, 31, 0.55);
  }
  .dimad-snap-range {
    border: 0; background: transparent; color: var(--snap-mute);
    font: inherit; font-size: 9px; font-weight: 700;
    letter-spacing: 0.02em; padding: 3px 5px; border-radius: 999px; cursor: pointer;
  }
  .dimad-snap-range.active {
    background: var(--snap-gold-soft); color: var(--snap-gold);
  }
  .dimad-snap-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 5px;
    margin: 0 0 6px;
  }
  .dimad-snap-metric {
    background: rgba(7, 16, 31, 0.45);
    border: 1px solid var(--snap-line);
    border-radius: 9px;
    padding: 6px 8px 5px;
    min-height: 0;
  }
  .dimad-snap-metric-label {
    margin: 0;
    font-size: 8px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--snap-mute);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dimad-snap-metric-value {
    margin: 3px 0 0;
    font-size: 14px;
    line-height: 1.1;
    font-weight: 700;
    color: var(--snap-ink);
    letter-spacing: -0.02em;
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
    border-top: 1px solid var(--snap-line); padding-top: 6px;
    position: relative;
  }
  .dimad-snap-connected {
    border: 1px solid var(--snap-line);
    background: transparent;
    color: var(--snap-mute);
    font: inherit;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 4px 8px;
    cursor: pointer;
  }
  .dimad-snap-connected:hover { color: var(--snap-gold); border-color: var(--snap-gold); }
  .dimad-snap-connected-menu {
    position: absolute; left: 0; bottom: calc(100% + 6px); z-index: 22;
    min-width: 180px; max-width: 240px;
    background: #07101f; border: 1px solid var(--snap-line); border-radius: 10px;
    padding: 6px 8px; box-shadow: 0 18px 40px rgba(0,0,0,0.35);
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
  .dimad-snap-link:hover { text-decoration: underline; }
  .dimad-snap-empty-wrap {
    display: grid; place-items: center; text-align: center;
    min-height: 132px; padding: 10px 8px 4px;
  }
  .dimad-snap-empty-copy {
    margin: 0 0 10px; color: var(--snap-mute); font-size: 11px; line-height: 1.35;
  }
  .dimad-snap-cta {
    border: 1px solid var(--snap-gold);
    background: var(--snap-gold-soft);
    color: var(--snap-gold);
    font: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border-radius: 999px;
    padding: 8px 12px;
    cursor: pointer;
  }
  .dimad-snap-cta:hover { background: rgba(212, 175, 55, 0.22); }
  .dimad-snap-card-wrap { position: relative; height: 100%; }
`;

export type SnapshotRange = "1D" | "1W" | "1M" | "1Q" | "1Y";
export const SNAPSHOT_RANGES: SnapshotRange[] = ["1D", "1W", "1M", "1Q", "1Y"];
