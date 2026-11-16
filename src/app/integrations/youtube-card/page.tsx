import ControlCenterYouTube from "@/components/integrations/ControlCenterYouTube";

export const dynamic = "force-dynamic";

export default function YouTubeWidgetPage() {
  return (
    <>
      <style>{`html,body{margin:0;background:#070A0F;color-scheme:dark}`}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" />
      <ControlCenterYouTube />
    </>
  );
}
