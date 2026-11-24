import YerevanDashboardHeaderMount from "@/components/dashboard/YerevanDashboardHeaderMount";
import { playfairDisplay } from "@/lib/fonts/playfair";
import { EMBED_PAGE_STYLE } from "@/lib/theme/embedStyles";
import Script from "next/script";

export const dynamic = "force-dynamic";

const HEADER_EMBED_STYLE = `
${EMBED_PAGE_STYLE}
html, body {
  overflow: hidden;
  background: transparent !important;
}
body {
  padding: 0;
}
`;

/** Standalone preview / debug route — Command Center mounts the same component natively (no iframe). */
export default function YerevanHeaderPage() {
  return (
    <>
      <style>{HEADER_EMBED_STYLE}</style>
      <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      <main
        className={`${playfairDisplay.variable} ${playfairDisplay.className}`}
        style={{ margin: 0, padding: 0, background: "transparent", minHeight: "100%" }}
      >
        <YerevanDashboardHeaderMount />
      </main>
    </>
  );
}
