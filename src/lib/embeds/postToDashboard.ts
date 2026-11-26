/** Bridge widget → Command Center shell (iframe parent or same-window native island). */
export function postToDashboard(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const target = window.parent !== window ? window.parent : window;
  try {
    target.postMessage(payload, window.location.origin);
  } catch {
    /* ignore */
  }
}
