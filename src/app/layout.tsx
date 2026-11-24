import { PlatformSyncProvider } from "@/components/shared/PlatformSyncProvider";
import { WorkspaceDataProvider } from "@/components/workspace/WorkspaceDataProvider";
import ThemeSync from "@/components/theme/ThemeSync";
import { THEME_FOUC_SCRIPT, THEME_TOKENS_CSS } from "@/lib/theme/bootstrap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Runs before paint; suppressHydrationWarning allows data-theme to differ from SSR. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_FOUC_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: THEME_TOKENS_CSS }} />
        <ThemeSync />
        <WorkspaceDataProvider>
          <PlatformSyncProvider>{children}</PlatformSyncProvider>
        </WorkspaceDataProvider>
      </body>
    </html>
  );
}
