/** Navigate from snapshot cards into the DIMAD shell tabs / vault. */

declare global {
  interface Window {
    switchTab?: (tabId: string) => void;
    openSettingsVaultNav?: (section?: string) => void;
  }
}

export function openShellTab(tabId: "ent-crm" | "ent-growth") {
  try {
    if (typeof window.switchTab === "function") {
      window.switchTab(tabId);
      return;
    }
  } catch {
    /* ignore */
  }
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "dimad-open-tab", tabId }, window.location.origin);
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.assign(`/dashboard/index.html#${tabId}`);
}

export function openIntegrationsSettings() {
  try {
    if (typeof window.openSettingsVaultNav === "function") {
      window.openSettingsVaultNav("integrations");
      return;
    }
  } catch {
    /* ignore */
  }
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
