/**
 * Dimad performance instrumentation.
 * Server: console.time / console.timeEnd (terminal)
 * Client: performance.now() + console.log (browser)
 *
 * Enable/disable via:
 *   NEXT_PUBLIC_DIMAD_PERF=1  (client)
 *   DIMAD_PERF=1              (server; also on when NODE_ENV=development)
 */

const SERVER_ENABLED =
  process.env.DIMAD_PERF === "1" ||
  process.env.DIMAD_PERF === "true" ||
  process.env.NODE_ENV === "development";

export function perfEnabled() {
  if (typeof window === "undefined") return SERVER_ENABLED;
  try {
    if (window.localStorage.getItem("dimad_perf") === "0") return false;
    if (window.localStorage.getItem("dimad_perf") === "1") return true;
  } catch {
    /* ignore */
  }
  return process.env.NEXT_PUBLIC_DIMAD_PERF !== "0";
}

export function perfMark(label: string, detail?: Record<string, unknown>) {
  if (!perfEnabled()) return;
  const ts =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now().toFixed(1)
      : String(Date.now());
  const extra = detail ? ` ${JSON.stringify(detail)}` : "";
  console.log(`[dimad-perf ${ts}ms] ${label}${extra}`);
}

export function perfTime<T>(label: string, fn: () => Promise<T>): Promise<T>;
export function perfTime<T>(label: string, fn: () => T): T;
export function perfTime<T>(label: string, fn: () => T | Promise<T>): T | Promise<T> {
  if (!perfEnabled()) return fn();
  const start =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  console.time(`dimad:${label}`);
  try {
    const result = fn();
    if (result && typeof (result as Promise<T>).then === "function") {
      return (result as Promise<T>).then(
        (value) => {
          console.timeEnd(`dimad:${label}`);
          const end =
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          console.log(`[dimad-perf] ${label} → ${(end - start).toFixed(1)}ms`);
          return value;
        },
        (err) => {
          console.timeEnd(`dimad:${label}`);
          const end =
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          console.log(`[dimad-perf] ${label} FAIL → ${(end - start).toFixed(1)}ms`, err);
          throw err;
        }
      );
    }
    console.timeEnd(`dimad:${label}`);
    const end =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    console.log(`[dimad-perf] ${label} → ${(end - start).toFixed(1)}ms`);
    return result;
  } catch (err) {
    console.timeEnd(`dimad:${label}`);
    throw err;
  }
}

/** Manual start/end for spans that cross scopes. */
export function perfStart(label: string) {
  if (!perfEnabled()) return { end: () => 0 };
  const start =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  console.time(`dimad:${label}`);
  return {
    end: (detail?: Record<string, unknown>) => {
      console.timeEnd(`dimad:${label}`);
      const end =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const ms = end - start;
      const extra = detail ? ` ${JSON.stringify(detail)}` : "";
      console.log(`[dimad-perf] ${label} → ${ms.toFixed(1)}ms${extra}`);
      return ms;
    }
  };
}
