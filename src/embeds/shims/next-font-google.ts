/** esbuild shim — next/font/google is Next-compiler only. Embed uses CSS variable + swap stylesheet. */
export function Playfair_Display(_opts?: unknown) {
  return {
    className: "font-playfair-embed",
    variable: "font-playfair-embed-var",
    style: { fontFamily: "var(--font-playfair), 'Playfair Display', Georgia, serif" }
  };
}
