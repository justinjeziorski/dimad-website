/** Navigate from snapshot iframes into the DIMAD shell tabs / vault. */

export function openShellTab(tabId: "ent-crm" | "ent-growth") {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "dimad-open-tab", tabId }, window.location.origin);
      return;
    }
  } catch {
    /* ignore */
  }
  // Fallback when opened outside the shell.
  window.location.assign(`/dashboard/index.html#${tabId}`);
}

export function openIntegrationsSettings() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "dimad-open-integrations" }, window.location.origin);
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.assign("/dashboard/settings/integrations");
}
