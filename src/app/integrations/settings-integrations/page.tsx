import IntegrationsHub from "@/components/settings/IntegrationsHub";

export const dynamic = "force-dynamic";

export default function SettingsIntegrationsEmbedPage() {
  return (
    <>
      <style>{`html,body{margin:0;overflow:hidden;background:transparent;color-scheme:dark}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <IntegrationsHub />
    </>
  );
}
