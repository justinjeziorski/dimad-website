/** Shared tactical Command Center card chrome (matches slate-900 / brand tokens). */
export const INTEGRATION_CARD_CSS = `
  .dimad-int-card {
    box-sizing: border-box;
    width: 100%;
    background: #0B0F17;
    border: 1px solid #1E293B;
    border-radius: 16px;
    padding: 14px 16px 16px;
    color: #f8fafc;
    font-family: "JetBrains Mono", ui-monospace, "Cascadia Mono", "Segoe UI Mono", monospace;
  }
  .dimad-int-card * { box-sizing: border-box; }
  .dimad-int-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .dimad-int-brand {
    width: 34px; height: 34px; border-radius: 10px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid #1E293B; background: #070A0F; color: #F59E0B; flex: none;
  }
  .dimad-int-brand.stripe { color: #38BDF8; border-color: rgba(56,189,248,0.35); background: rgba(56,189,248,0.08); }
  .dimad-int-brand.shopify { color: #F59E0B; border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.08); }
  .dimad-int-kicker { margin: 0; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #94a3b8; }
  .dimad-int-card h2 { margin: 3px 0 0; font-size: 13px; font-weight: 700; color: #fff; }
  .dimad-int-meta { margin: 6px 0 0; color: #64748b; font-size: 10px; }
  .dimad-int-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; align-items: center; }
  .dimad-int-badge {
    border: 1px solid rgba(16,185,129,0.35);
    background: rgba(16,185,129,0.1);
    color: #34d399;
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .dimad-int-badge.muted {
    border-color: #1E293B;
    background: #070A0F;
    color: #94a3b8;
  }
  .dimad-int-ghost, .dimad-int-primary, .dimad-int-amber { font: inherit; cursor: pointer; border-radius: 10px; }
  .dimad-int-ghost {
    background: #070A0F;
    color: #e2e8f0;
    border: 1px solid #1E293B;
    padding: 6px 8px;
    font-size: 10px;
  }
  .dimad-int-ghost:hover:not(:disabled) { border-color: #F59E0B; color: #F59E0B; }
  .dimad-int-ghost:disabled, .dimad-int-primary:disabled, .dimad-int-amber:disabled { opacity: 0.55; cursor: wait; }
  .dimad-int-primary {
    display: flex; width: 100%; justify-content: center; margin-top: 12px;
    background: #38BDF8; color: #070A0F; border: 0; padding: 10px 12px; font-size: 12px; font-weight: 700; text-decoration: none;
  }
  .dimad-int-primary:hover { background: #7dd3fc; }
  .dimad-int-amber {
    background: #F59E0B; color: #070A0F; border: 0; padding: 10px 12px; font-size: 11px; font-weight: 700;
  }
  .dimad-int-amber:hover { background: #fbbf24; }
  .dimad-int-note { margin: 8px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5; }
  .dimad-int-banner { margin-bottom: 10px; border-radius: 10px; padding: 8px 10px; font-size: 11px; line-height: 1.4; }
  .dimad-int-banner.ok { background: rgba(16,185,129,0.1); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.35); }
  .dimad-int-banner.bad { background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); }
  .dimad-int-form { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .dimad-int-form input {
    flex: 1 1 180px; min-width: 0; background: #070A0F; border: 1px solid #1E293B; border-radius: 10px;
    color: #f8fafc; padding: 10px 12px; font: inherit; font-size: 11px;
  }
  .dimad-int-form input:focus { outline: 2px solid #F59E0B; outline-offset: 1px; }
  .dimad-int-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
  .dimad-int-metric {
    background: #070A0F; border: 1px solid #1E293B; border-radius: 12px; padding: 8px 10px; min-width: 0; text-align: left;
  }
  .dimad-int-metric .k { font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #94a3b8; }
  .dimad-int-metric .v { margin-top: 4px; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; color: #fff; }
  .dimad-int-metric .s { margin-top: 3px; font-size: 10px; color: #64748b; }
  .dimad-int-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
  .dimad-int-col h3 { margin: 0 0 8px; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #94a3b8; }
  .dimad-int-row {
    display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
    padding: 7px 0; border-top: 1px solid #1E293B; font-size: 11px;
  }
  .dimad-int-row .title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cbd5e1; }
  .dimad-int-row .meta { flex: none; color: #64748b; }
  .dimad-int-row b { flex: none; font-weight: 650; color: #fff; }
  .dimad-int-empty { margin: 4px 0 0; color: #64748b; font-size: 11px; font-style: italic; }
  .dimad-int-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #1E293B; }
  .dimad-int-link { background: none; border: 0; color: #38BDF8; font: inherit; font-size: 10px; font-weight: 700; cursor: pointer; padding: 0; }
  .dimad-int-link:hover { color: #F59E0B; }
  .dimad-int-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .dimad-int-table th { text-align: left; color: #64748b; font-weight: 500; padding: 0 0 8px; border-bottom: 1px solid #1E293B; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
  .dimad-int-table td { padding: 8px 0; border-bottom: 1px solid rgba(30,41,59,0.7); color: #cbd5e1; vertical-align: top; }
  .dimad-int-table td.right, .dimad-int-table th.right { text-align: right; }
  .dimad-int-table .strong { color: #fff; font-weight: 650; }
  .dimad-int-table .mint { color: #34d399; }
  @media (max-width: 720px) {
    .dimad-int-metrics, .dimad-int-grid { grid-template-columns: 1fr; }
  }
`;
