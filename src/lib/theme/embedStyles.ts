/** Shared iframe/embed chrome — CSS-only (no inline body mutation) for clean hydration. */
export const EMBED_PAGE_STYLE = `
html, body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: var(--bg-canvas, #060911);
  color: var(--text-primary, #f1f5f9);
  color-scheme: dark;
}
html[data-theme="light"],
html[data-theme="light"] body {
  background: #e8ecf2 !important;
  color: #000000 !important;
  color-scheme: light;
}
#__next, body > div { height: 100%; background: transparent; }
`;

export const EMBED_CARD_STYLE = `
html, body {
  margin: 0;
  background: var(--bg-canvas, #070A0F);
  color-scheme: dark;
}
html[data-theme="light"],
html[data-theme="light"] body {
  background: #e8ecf2 !important;
  color-scheme: light;
}
`;
