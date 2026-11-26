import { create } from "zustand";
import {
  addDays,
  addMonths,
  format,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths
} from "date-fns";
import type { AgendaMode } from "@/lib/calendar/types";
import { ensureWindow, invalidateMonthCache, seedMonthFromLocal } from "@/lib/calendar/eventsCache";

function today(): Date {
  return startOfDay(new Date());
}

function syncLegacyShell(selected: Date): void {
  try {
    const w = window as Window & {
      CALENDAR_NAV?: { dayOffset?: number; dateKey?: (d: Date) => string; syncCcScheduleToggle?: () => void };
      DIMAD_CAL?: { dayOffset?: number };
      dimadCal?: { currentDate?: Date };
      calendarClickCount?: number;
    };
    const t = today();
    const offset = Math.round((selected.getTime() - t.getTime()) / 86400000);
    if (w.CALENDAR_NAV) w.CALENDAR_NAV.dayOffset = offset;
    if (w.DIMAD_CAL) w.DIMAD_CAL.dayOffset = offset;
    if (w.dimadCal) w.dimadCal.currentDate = new Date(selected);
    w.calendarClickCount = offset === 0 ? 0 : 1;
  } catch {
    /* ignore */
  }
}

type CalendarState = {
  selectedDate: Date;
  visibleMonth: Date;
  agendaMode: AgendaMode;
  loadingWindow: boolean;
  eventsVersion: number;
  selectDate: (date: Date) => void;
  goToToday: () => void;
  nextMonth: () => void;
  prevMonth: () => void;
  nextDay: () => void;
  prevDay: () => void;
  jumpToDate: (date: Date) => void;
  setAgendaMode: (mode: AgendaMode) => void;
  ensureVisibleWindow: () => Promise<void>;
  refreshEvents: () => Promise<void>;
};

export const useCalendarStore = create<CalendarState>((set, get) => ({
  selectedDate: today(),
  visibleMonth: startOfMonth(new Date()),
  agendaMode: "daily",
  loadingWindow: false,
  eventsVersion: 0,

  selectDate: (date) => {
    const selected = startOfDay(date);
    const next: Partial<CalendarState> = { selectedDate: selected };
    if (!isSameMonth(selected, get().visibleMonth)) {
      next.visibleMonth = startOfMonth(selected);
    }
    set(next);
    syncLegacyShell(selected);
    void get().ensureVisibleWindow();
  },

  goToToday: () => {
    const selected = today();
    set({ selectedDate: selected, visibleMonth: startOfMonth(selected) });
    syncLegacyShell(selected);
    void get().ensureVisibleWindow();
  },

  nextMonth: () => {
    const visibleMonth = startOfMonth(addMonths(get().visibleMonth, 1));
    set({ visibleMonth });
    void get().ensureVisibleWindow();
  },

  prevMonth: () => {
    const visibleMonth = startOfMonth(subMonths(get().visibleMonth, 1));
    set({ visibleMonth });
    void get().ensureVisibleWindow();
  },

  nextDay: () => {
    get().selectDate(addDays(get().selectedDate, 1));
  },

  prevDay: () => {
    get().selectDate(subDays(get().selectedDate, 1));
  },

  jumpToDate: (date) => {
    const selected = startOfDay(date);
    set({ selectedDate: selected, visibleMonth: startOfMonth(selected) });
    syncLegacyShell(selected);
    void get().ensureVisibleWindow();
  },

  setAgendaMode: (mode) => {
    set({ agendaMode: mode === "weekly" ? "weekly" : "daily" });
    try {
      const w = window as Window & {
        CALENDAR_NAV?: { mode?: string; syncCcScheduleToggle?: () => void };
      };
      if (w.CALENDAR_NAV) {
        w.CALENDAR_NAV.mode = mode === "weekly" ? "weekly" : "hourly";
        w.CALENDAR_NAV.syncCcScheduleToggle?.();
      }
    } catch {
      /* ignore */
    }
  },

  ensureVisibleWindow: async () => {
    const { visibleMonth } = get();
    seedMonthFromLocal(visibleMonth);
    set({ loadingWindow: true });
    try {
      await ensureWindow(visibleMonth);
      set({ eventsVersion: get().eventsVersion + 1 });
    } finally {
      set({ loadingWindow: false });
    }
  },

  refreshEvents: async () => {
    invalidateMonthCache();
    await get().ensureVisibleWindow();
  }
}));

export function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDateKey(key: string): Date {
  return startOfDay(parseISO(key));
}

/** Imperative API for legacy HTML chrome (Today, Daily/Weekly, New Event). */
export function getCalendarActions() {
  const s = useCalendarStore.getState();
  return {
    selectDate: s.selectDate,
    goToToday: s.goToToday,
    nextMonth: s.nextMonth,
    prevMonth: s.prevMonth,
    nextDay: s.nextDay,
    prevDay: s.prevDay,
    jumpToDate: s.jumpToDate,
    setAgendaMode: s.setAgendaMode,
    refreshEvents: s.refreshEvents,
    getSelectedDateKey: () => dateKey(useCalendarStore.getState().selectedDate)
  };
}
