import IntegrationsHub from "@/components/settings/IntegrationsHub";
import { SNAPSHOT_THEME } from "@/lib/snapshots/theme";

export const dynamic = "force-dynamic";

export default function IntegrationsSettingsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        background: `linear-gradient(180deg, ${SNAPSHOT_THEME.navySoft} 0%, ${SNAPSHOT_THEME.navy} 45%, var(--bg-canvas) 100%)`,
        padding: "28px 20px 48px"
      }}
    >
      <style>{`html,body{margin:0;background:var(--bg-canvas)}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <IntegrationsHub />
      </div>
    </main>
  );
}
