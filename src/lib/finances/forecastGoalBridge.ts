export type ForecastGoalPayload = {
  text: string;
  targetValue: number;
  deadline: string;
  forecastGrowth: number;
  forecastMonths: number;
  categoryTitle: string;
  categoryType: "REVENUE" | "EXPENSE";
  horizon?: string;
  recurring?: boolean;
};

type GoalsHost = Window & {
  DIMAD_GOALS?: {
    openComposerFromForecast?: (goal: ForecastGoalPayload) => void;
  };
  switchTab?: (tabId: string) => void;
  initGoalsRewards?: () => void;
};

function tryOpenOnHost(host: Window | null | undefined, goal: ForecastGoalPayload): boolean {
  if (!host) return false;
  try {
    const w = host as GoalsHost;
    if (typeof w.DIMAD_GOALS?.openComposerFromForecast !== "function") return false;
    if (typeof w.switchTab === "function") w.switchTab("ent-goals");
    else if (typeof w.initGoalsRewards === "function") w.initGoalsRewards();
    w.DIMAD_GOALS.openComposerFromForecast(goal);
    return true;
  } catch {
    // Cross-origin parent — fall through to postMessage.
    return false;
  }
}

/**
 * Open Accountability "New Goal" prefilled from a Finances/Revenue forecast.
 * Prefers same-origin direct host calls, then postMessage to the Command Center shell.
 */
export function openForecastGoalInAccountability(goalInput: ForecastGoalPayload) {
  if (typeof window === "undefined") {
    throw new Error("Forecast goals can only be created in the browser.");
  }

  const goal: ForecastGoalPayload = {
    ...goalInput,
    horizon: goalInput.horizon || "one_time",
    recurring: false
  };

  const payload = { type: "dimad-open-forecast-goal" as const, goal };

  if (tryOpenOnHost(window.parent !== window ? window.parent : null, goal)) return;
  if (tryOpenOnHost(window.top !== window ? window.top : null, goal)) return;
  if (tryOpenOnHost(window, goal)) return;

  if (window.parent && window.parent !== window) {
    const origin = window.location.origin;
    window.parent.postMessage({ type: "dimad-open-tab", tabId: "ent-goals" }, origin);
    window.parent.postMessage(payload, origin);
    return;
  }

  throw new Error("Open Finances from the Command Center to create goals.");
}
