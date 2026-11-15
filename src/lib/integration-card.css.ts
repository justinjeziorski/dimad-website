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
  .dimad-int-brand.gumroad { color: #F472B6; border-color: rgba(244,114,182,0.35); background: rgba(244,114,182,0.08); }
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
  .dimad-int-primary.gumroad { background: #F472B6; color: #070A0F; }
  .dimad-int-primary.gumroad:hover { background: #f9a8d4; }
  .dimad-int-amber {
    background: #F59E0B; color: #070A0F; border: 0; padding: 10px 12px; font-size: 11px; font-weight: 700;
  }
  .dimad-int-amber:hover { background: #fbbf24; }
  .dimad-int-note { margin: 8px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.5; }
  .dimad-int-loading {
    margin-top: 12px;
    display: grid;
    gap: 8px;
  }
  .dimad-int-loading .label {
    margin: 0;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 700;
  }
  .dimad-int-loading .bar {
    width: 100%;
    height: 3px;
    border-radius: 999px;
    background: #1E293B;
    overflow: hidden;
  }
  .dimad-int-loading .bar > span {
    display: block;
    height: 100%;
    width: 38%;
    border-radius: inherit;
    background: linear-gradient(90deg, #38BDF8, #7dd3fc, #38BDF8);
    background-size: 200% 100%;
    animation: dimad-int-loading-slide 1.15s linear infinite;
  }
  .dimad-int-loading.amber .bar > span {
    background: linear-gradient(90deg, #F59E0B, #fbbf24, #F59E0B);
    background-size: 200% 100%;
  }
  @keyframes dimad-int-loading-slide {
    from { transform: translateX(-120%); }
    to { transform: translateX(280%); }
  }
  .dimad-int-banner { margin-bottom: 10px; border-radius: 10px; padding: 8px 10px; font-size: 11px; line-height: 1.4; }
  .dimad-int-banner.ok { background: rgba(16,185,129,0.1); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.35); }
  .dimad-int-banner.bad { background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); }
  .dimad-int-form { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .dimad-int-form input {
    flex: 1 1 180px; min-width: 0; background: #070A0F; border: 1px solid #1E293B; border-radius: 10px;
    color: #f8fafc; padding: 8px 12px; font: inherit; font-size: 11px; line-height: 1.25;
    height: 36px; box-sizing: border-box;
  }
  .dimad-int-form.stack {
    flex-direction: column; flex-wrap: nowrap; align-items: stretch;
  }
  .dimad-int-form.stack input {
    flex: 0 0 auto; width: 100%;
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
  .dimad-int-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .dimad-int-pill {
    font: inherit; cursor: pointer; border-radius: 999px; padding: 5px 10px; font-size: 10px;
    background: #070A0F; color: #94a3b8; border: 1px solid #1E293B;
  }
  .dimad-int-pill.active {
    color: #070A0F; background: #F59E0B; border-color: #F59E0B; font-weight: 700;
  }
  .dimad-int-pill.stripe.active { background: #38BDF8; border-color: #38BDF8; }
  .dimad-int-change { font-size: 10px; margin-top: 3px; }
  .dimad-int-change.up { color: #34d399; }
  .dimad-int-change.down { color: #fca5a5; }
  .dimad-int-change.flat { color: #64748b; }
  .dimad-int-account { position: relative; flex: none; }
  .dimad-int-account-badge {
    max-width: 15rem; display: inline-flex; align-items: center; gap: 8px;
    padding: 4px 10px 4px 4px; border-radius: 999px; border: 1px solid #1E293B;
    background: #070A0F; color: #e2e8f0; cursor: pointer; font: inherit; text-align: left;
  }
  .dimad-int-account-badge:hover { border-color: #F59E0B; }
  .dimad-int-account.stripe .dimad-int-account-badge:hover { border-color: #38BDF8; }
  .dimad-int-account-avatar {
    width: 22px; height: 22px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center;
    background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35); color: #F59E0B;
    font-size: 9px; font-weight: 700; flex: none;
  }
  .dimad-int-account.stripe .dimad-int-account-avatar {
    background: rgba(56,189,248,0.15); border-color: rgba(56,189,248,0.35); color: #38BDF8;
  }
  .dimad-int-account-copy { min-width: 0; display: grid; gap: 1px; }
  .dimad-int-account-copy .k { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b; line-height: 1; }
  .dimad-int-account-copy .v { font-size: 10px; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 11rem; }
  .dimad-int-account-menu {
    position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; min-width: 8rem;
    border: 1px solid #1E293B; background: #070A0F; border-radius: 10px; overflow: hidden;
    box-shadow: 0 12px 30px rgba(0,0,0,0.35);
  }
  .dimad-int-account-menu button {
    width: 100%; text-align: left; background: transparent; border: 0; color: #e2e8f0;
    font: inherit; font-size: 11px; padding: 10px 12px; cursor: pointer;
  }
  .dimad-int-account-menu button:hover { background: #0B0F17; color: #F59E0B; }
  .dimad-int-metrics.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .dimad-int-dates { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: end; }
  .dimad-int-dates label { display: grid; gap: 4px; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; }
  .dimad-int-dates input {
    background: #070A0F; border: 1px solid #1E293B; border-radius: 10px; color: #f8fafc;
    padding: 8px 10px; font: inherit; font-size: 11px;
  }
  .dimad-int-help {
    margin-top: 12px;
    border: 1px solid #1E293B;
    border-radius: 12px;
    background: #070A0F;
    overflow: hidden;
  }
  .dimad-int-help-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    background: transparent;
    border: 0;
    color: #e2e8f0;
    font: inherit;
    font-size: 11px;
    text-align: left;
    cursor: pointer;
  }
  .dimad-int-help-trigger:hover { color: #F59E0B; }
  .dimad-int-help-trigger[aria-expanded="true"] { color: #F59E0B; border-bottom: 1px solid #1E293B; }
  .dimad-int-help-mark {
    width: 22px; height: 22px; border-radius: 999px; flex: none;
    display: inline-flex; align-items: center; justify-content: center;
    border: 1px solid rgba(245,158,11,0.45);
    background: rgba(245,158,11,0.12);
    color: #F59E0B;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
  }
  .dimad-int-help-title { flex: 1; min-width: 0; font-weight: 650; }
  .dimad-int-help-chevron {
    flex: none; color: #64748b; font-size: 10px; transition: transform 0.15s ease;
  }
  .dimad-int-help-trigger[aria-expanded="true"] .dimad-int-help-chevron { transform: rotate(180deg); color: #F59E0B; }
  .dimad-int-help-body {
    padding: 10px 12px 12px;
    display: grid;
    gap: 10px;
  }
  .dimad-int-help-step {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
  }
  .dimad-int-help-step .n {
    width: 22px; height: 22px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
    color: #F59E0B; font-size: 10px; font-weight: 700;
  }
  .dimad-int-help-step .t { margin: 0; font-size: 11px; font-weight: 700; color: #f8fafc; }
  .dimad-int-help-step .d { margin: 3px 0 0; font-size: 10px; line-height: 1.5; color: #94a3b8; }
  .dimad-int-help-step code {
    font: inherit; font-size: 10px; color: #F59E0B;
    background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
    border-radius: 4px; padding: 1px 5px;
  }
  @media (max-width: 720px) {
    .dimad-int-metrics, .dimad-int-metrics.four, .dimad-int-grid { grid-template-columns: 1fr; }
  }
`;
