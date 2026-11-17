/** Hard-navigate within the Revenue workspace (iframe-safe). */
export function goRevenue(path: string) {
  if (typeof window === "undefined") return;
  const href = path.startsWith("/") ? path : `/dashboard/revenue/${path}`;
  window.location.assign(href);
}
