import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import CcAgendaTimeline from "@/components/calendar/CcAgendaTimeline";
import CcMonthPicker from "@/components/calendar/CcMonthPicker";
import { ensureCalendarIslandCss } from "@/lib/calendar/calendarIslandCss";
import { getCalendarActions, useCalendarStore } from "@/lib/calendar/store";

const roots = new WeakMap<Element, Root>();

function mountInto(el: HTMLElement, node: ReactNode): void {
  if (!el) return;
  ensureCalendarIslandCss();
  el.replaceChildren();
  let root = roots.get(el);
  if (!root) {
    root = createRoot(el);
    roots.set(el, root);
  }
  root.render(node);
}

export function mountCcAgenda(el: HTMLElement): void {
  void useCalendarStore.getState().ensureVisibleWindow();
  mountInto(el, <CcAgendaTimeline />);
}

export function mountCcCalendar(el: HTMLElement): void {
  void useCalendarStore.getState().ensureVisibleWindow();
  mountInto(el, <CcMonthPicker />);
}

export function unmountCcCalendarIsland(el: HTMLElement): void {
  const root = roots.get(el);
  if (!root) return;
  root.unmount();
  roots.delete(el);
}

declare global {
  interface Window {
    __DIMAD_MOUNT_CC_AGENDA?: typeof mountCcAgenda;
    __DIMAD_MOUNT_CC_CALENDAR?: typeof mountCcCalendar;
    __DIMAD_UNMOUNT_CC_CALENDAR?: typeof unmountCcCalendarIsland;
    __DIMAD_CC_CAL?: ReturnType<typeof getCalendarActions>;
  }
}

if (typeof window !== "undefined") {
  window.__DIMAD_MOUNT_CC_AGENDA = mountCcAgenda;
  window.__DIMAD_MOUNT_CC_CALENDAR = mountCcCalendar;
  window.__DIMAD_UNMOUNT_CC_CALENDAR = unmountCcCalendarIsland;
  window.__DIMAD_CC_CAL = getCalendarActions();

  /* Keep imperative API in sync with store after HMR / remounts. */
  useCalendarStore.subscribe(() => {
    window.__DIMAD_CC_CAL = getCalendarActions();
  });
}
