/** Hard-navigate within the Finances workspace (iframe-safe). */
export function goFinances(path: string) {
  if (typeof window === "undefined") return;
  const href = path.startsWith("/") ? path : `/dashboard/finances/${path}`;
  window.location.assign(href);
}
