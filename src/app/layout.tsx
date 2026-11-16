import { WorkspaceDataProvider } from "@/components/workspace/WorkspaceDataProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WorkspaceDataProvider>{children}</WorkspaceDataProvider>
      </body>
    </html>
  );
}
