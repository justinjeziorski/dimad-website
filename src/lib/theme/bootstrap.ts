/** Shared app theme (dark default). Persist key matches dashboard shell. */
export const THEME_STORAGE_KEY = "dimad_theme";

export type AppTheme = "dark" | "light";

export function readStoredTheme(): AppTheme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Query `?theme=` wins when present; otherwise localStorage. */
export function resolveTheme(input?: { query?: string | null; stored?: string | null }): AppTheme {
  const q = input?.query;
  if (q === "light" || q === "dark") return q;
  return input?.stored === "light" ? "light" : "dark";
}

export function resolveThemeFromLocation(): AppTheme {
  try {
    const q = new URLSearchParams(window.location.search).get("theme");
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return resolveTheme({ query: q, stored });
  } catch {
    return "dark";
  }
}

export function applyDocumentTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
}

/** Inline FOUC script — query param wins (iframe embeds), then localStorage. */
export const THEME_FOUC_SCRIPT = `(function(){try{var q=new URLSearchParams(location.search).get('theme');var s=localStorage.getItem('${THEME_STORAGE_KEY}');var t=(q==='light'||q==='dark')?q:(s==='light'?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

/** Minimal token sheet for React routes / iframe embeds (mirrors assets/theme.css). */
export const THEME_TOKENS_CSS = `
:root, :root[data-theme="dark"] {
  color-scheme: dark;
  --bg-canvas: #060911;
  --bg-card: #0c1220;
  --bg-nested: #080c16;
  --bg-nav: #080c16;
  --bg-hover: #121a2a;
  --bg-canvas-rgb: 6 9 17;
  --bg-card-rgb: 12 18 32;
  --bg-nested-rgb: 8 12 22;
  --brand-ink: #060911;
  --brand-ink-rgb: 6 9 17;
  --border-subtle: #141c2b;
  --border-hairline: rgba(255, 255, 255, 0.06);
  --border-subtle-rgb: 20 28 43;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-primary-rgb: 241 245 249;
  --accent-gold: #f5b942;
  --accent-gold-hover: #fbbf24;
  --accent-gold-soft: rgba(245, 185, 66, 0.14);
  --accent-gold-border: rgba(245, 185, 66, 0.42);
  --accent-gold-fg: #060911;
  --accent-gold-rgb: 245 185 66;
  --accent-sky: #38bdf8;
  --accent-sky-rgb: 56 189 248;
  --accent-mint: #34d399;
  --accent-mint-rgb: 52 211 153;
  --status-ok: #34d399;
  --status-ok-bg: rgba(52, 211, 153, 0.12);
  --status-alert: #fb7185;
  --status-alert-bg: rgba(251, 113, 133, 0.12);
  --status-alert-rgb: 251 113 133;
  --overlay-scrim: rgba(6, 9, 17, 0.8);
  --shadow-elevated: 0 18px 40px rgba(0, 0, 0, 0.45);
  --canvas-glow-sky: rgba(56, 189, 248, 0.07);
  --canvas-glow-gold: rgba(245, 185, 66, 0.08);
  --card-surface: rgba(12, 18, 32, 0.85);
  --nav-surface: rgba(12, 18, 32, 0.78);
  --scrollbar-track: #060911;
  --scrollbar-thumb: #1a2233;
}
:root[data-theme="light"] {
  color-scheme: light;
  --bg-canvas: #e8ecf2;
  --bg-card: #ffffff;
  --bg-nested: #e2e7ef;
  --bg-nav: #e8ecf2;
  --bg-hover: #dde3ec;
  --bg-canvas-rgb: 232 236 242;
  --bg-card-rgb: 255 255 255;
  --bg-nested-rgb: 226 231 239;
  --brand-ink: #000000;
  --brand-ink-rgb: 0 0 0;
  --border-subtle: #e2e6ee;
  --border-hairline: #e2e6ee;
  --border-subtle-rgb: 226 230 238;
  --text-primary: #0b1220;
  --text-secondary: #3d4659;
  --text-muted: #6b7385;
  --text-placeholder: #8792a6;
  --text-primary-rgb: 11 18 32;
  --accent-gold: #b87d14;
  --accent-gold-hover: #9e690e;
  --accent-gold-soft: rgba(184, 125, 20, 0.14);
  --accent-gold-border: rgba(184, 125, 20, 0.42);
  --accent-gold-fg: #000000;
  --accent-gold-rgb: 184 125 20;
  --accent-sky: #0284c7;
  --accent-sky-rgb: 2 132 199;
  --accent-mint: #15803d;
  --accent-mint-rgb: 21 128 61;
  --status-ok: #15803d;
  --status-ok-bg: rgba(21, 128, 61, 0.1);
  --status-alert: #dc2626;
  --status-alert-bg: rgba(220, 38, 38, 0.1);
  --status-alert-rgb: 220 38 38;
  --overlay-scrim: rgba(17, 22, 34, 0.45);
  --shadow-elevated: 0 12px 28px rgba(17, 22, 34, 0.08);
  --canvas-glow-sky: rgba(2, 132, 199, 0.05);
  --canvas-glow-gold: rgba(184, 125, 20, 0.06);
  --card-surface: #ffffff;
  --nav-surface: #e8ecf2;
  --scrollbar-track: #e8ecf2;
  --scrollbar-thumb: #c5ccd8;
}
.text-brand-gold { color: var(--accent-gold) !important; }
.border-gold-soft { border-color: var(--accent-gold-border) !important; }
.bg-brand-gold { background-color: var(--accent-gold) !important; color: var(--accent-gold-fg) !important; }
/* Cards stay white; nested wells stay grey — matches assets/theme.css */
:root[data-theme="light"] .bg-brand-panel,
:root[data-theme="light"] .bg-slate-900 {
  background-color: var(--bg-card) !important;
  background: var(--bg-card) !important;
  color: var(--text-primary);
}
:root[data-theme="light"] .bg-slate-950,
:root[data-theme="light"] .bg-slate-950\\/40,
:root[data-theme="light"] .bg-slate-950\\/50,
:root[data-theme="light"] .bg-slate-950\\/60,
:root[data-theme="light"] .bg-slate-950\\/80,
:root[data-theme="light"] .bg-slate-900\\/40,
:root[data-theme="light"] .bg-slate-900\\/50,
:root[data-theme="light"] .bg-slate-900\\/60,
:root[data-theme="light"] .bg-slate-900\\/80,
:root[data-theme="light"] .bg-slate-900\\/90,
:root[data-theme="light"] .bg-slate-800,
:root[data-theme="light"] .bg-slate-800\\/40,
:root[data-theme="light"] .bg-slate-800\\/50,
:root[data-theme="light"] .bg-slate-800\\/60,
:root[data-theme="light"] .bg-slate-700,
:root[data-theme="light"] .bg-slate-600,
:root[data-theme="light"] .bg-brand-nested,
:root[data-theme="light"] .bg-brand-black\\/40,
:root[data-theme="light"] .bg-brand-black\\/50 {
  background-color: var(--bg-nested) !important;
  background: var(--bg-nested) !important;
}
:root[data-theme="light"] .text-white,
:root[data-theme="light"] .text-slate-50,
:root[data-theme="light"] .text-slate-100,
:root[data-theme="light"] .text-slate-200 {
  color: var(--text-primary) !important;
}
:root[data-theme="light"] .text-slate-300,
:root[data-theme="light"] .text-slate-400 {
  color: var(--text-secondary) !important;
}
:root[data-theme="light"] .text-slate-500,
:root[data-theme="light"] .text-slate-600 {
  color: var(--text-muted) !important;
}

html, body {
  background: var(--bg-canvas);
  color: var(--text-primary);
}
`;
