import { PlatformSyncProvider } from "@/components/shared/PlatformSyncProvider";
import { WorkspaceDataProvider } from "@/components/workspace/WorkspaceDataProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceDataProvider>
          <PlatformSyncProvider>{children}</PlatformSyncProvider>
        </WorkspaceDataProvider>
      </body>
    </html>
  );
}
