export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  time?: string;
  type?: string;
  source?: string;
  tone?: string;
  notes?: string;
  allDay?: boolean;
  cancelled?: boolean;
};

export type GlobalHoliday = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  region?: string;
};

export type AgendaMode = "daily" | "weekly";

export type MonthKey = string; // YYYY-MM
