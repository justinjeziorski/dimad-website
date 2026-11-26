/** Scoped CSS for Command Center calendar islands — avoids CDN Tailwind gaps on React markup. */
export const CALENDAR_ISLAND_CSS = `
.cc-cal-month {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.35rem;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100%;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}
.cc-cal-month__nav {
  position: relative;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 0 0 auto;
}
.cc-cal-month__weekdays {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
  gap: 1px;
  flex: 0 0 auto;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  color: #64748b;
  position: relative;
  z-index: 1;
  line-height: 1.2;
  padding-bottom: 2px;
}
.cc-cal-month__grid {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
  /* Fixed rows — never 1fr (collapses to 0 inside flex min-height:0 parents) */
  grid-auto-rows: 30px !important;
  grid-template-rows: none !important;
  gap: 2px;
  flex: 1 1 auto;
  min-height: 0 !important;
  height: auto !important;
  max-height: 100%;
  overflow: auto;
  position: relative;
  z-index: 0;
  align-content: start !important;
  isolation: isolate;
  box-sizing: border-box;
}
.cc-cal-month__cell {
  position: relative !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center;
  justify-content: center;
  float: none !important;
  clear: none !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  height: 30px !important;
  min-height: 30px !important;
  max-height: 30px !important;
  margin: 0 !important;
  overflow: hidden !important;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  padding: 0 !important;
  font-size: 10px !important;
  line-height: 1 !important;
  font-variant-numeric: tabular-nums;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  isolation: isolate;
  box-sizing: border-box !important;
}
.cc-cal-month__cell-num {
  display: block !important;
  position: static !important;
  z-index: 1;
  line-height: 1 !important;
  font-size: 10px !important;
  white-space: nowrap !important;
}
.cc-cal-month__cell-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 3px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 4px;
  pointer-events: none;
}
.cc-cal-month__dot {
  display: block;
  width: 3px;
  height: 3px;
  border-radius: 9999px;
  flex-shrink: 0;
}
.cc-cal-month__dot--event { background: var(--accent-gold, #f5b942); }
.cc-cal-month__dot--holiday { background: rgba(52, 211, 153, 0.85); }
.cc-cal-month__cell--out {
  color: #475569;
}
.cc-cal-month__cell--today {
  border-color: rgba(245, 185, 66, 0.35);
  background: rgba(245, 185, 66, 0.05);
  color: var(--accent-gold, #f5b942);
}
.cc-cal-month__cell--selected {
  border-color: rgba(245, 185, 66, 0.55);
  background: rgba(245, 185, 66, 0.15);
  color: var(--accent-gold, #f5b942);
  font-weight: 600;
}
.cc-cal-month__cell:hover {
  background: rgba(255, 255, 255, 0.05);
}

.cc-week-dayhead {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  min-width: 0;
  padding: 2px 2px 4px;
  border-radius: 0.375rem;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.cc-week-dayhead__label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9px;
  color: #94a3b8;
  white-space: nowrap;
}
.cc-week-dayhead--on .cc-week-dayhead__label,
.cc-week-dayhead--today .cc-week-dayhead__label {
  color: var(--accent-gold, #f5b942);
  font-weight: 600;
}
.cc-week-dayhead__badge {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-radius: 9999px;
  border: 1px solid rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.1);
  color: #a7f3d0;
  font-size: 8px;
  font-weight: 600;
  line-height: 1.2;
  padding: 1px 5px;
}
.cc-week-dayhead__badge--event {
  border-color: rgba(245, 185, 66, 0.35);
  background: rgba(245, 185, 66, 0.1);
  color: var(--accent-gold, #f5b942);
}
`;

let injected = false;

export function ensureCalendarIslandCss(): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("cc-calendar-island-css");
  if (existing) {
    existing.textContent = CALENDAR_ISLAND_CSS;
    injected = true;
    return;
  }
  if (injected) return;
  const style = document.createElement("style");
  style.id = "cc-calendar-island-css";
  style.textContent = CALENDAR_ISLAND_CSS;
  document.head.appendChild(style);
  injected = true;
}
