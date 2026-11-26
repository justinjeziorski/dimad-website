"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek
} from "date-fns";
import { holidaysOnDate } from "@/lib/calendar/holidays";
import { eventsForDate } from "@/lib/calendar/eventsCache";
import { dateKey, useCalendarStore } from "@/lib/calendar/store";
import type { CalendarEvent } from "@/lib/calendar/types";
import { ensureCalendarIslandCss } from "@/lib/calendar/calendarIslandCss";
import DateJumper from "@/components/calendar/DateJumper";

const HOUR_PX = 36;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_COL = 42;

function toMinutes(hhmm?: string): number {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function endTimeOf(ev: CalendarEvent): string {
  if (ev.endTime) return ev.endTime;
  const start = toMinutes(ev.startTime || ev.time);
  const end = start + 60;
  const h = Math.floor(end / 60) % 24;
  const m = end % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function openComposer(date: string, time?: string) {
  try {
    const w = window as Window & {
      DIMAD_CAL?: { openComposer?: (opts: { date: string; time?: string }) => void };
    };
    w.DIMAD_CAL?.openComposer?.({ date, time });
  } catch {
    /* ignore */
  }
}

function openEvent(id: string) {
  try {
    const w = window as Window & { DIMAD_CAL?: { openEvent?: (id: string) => void } };
    w.DIMAD_CAL?.openEvent?.(id);
  } catch {
    /* ignore */
  }
}

function weekStartsOn(): 0 | 1 {
  try {
    const raw = JSON.parse(localStorage.getItem("dimad_cal_settings") || "{}");
    return raw.weekStartsOn === "sunday" ? 0 : 1;
  } catch {
    return 1;
  }
}

function useHandPan(paneRef: RefObject<HTMLDivElement | null>) {
  const pan = useRef({
    active: false,
    panning: false,
    x: 0,
    y: 0,
    sl: 0,
    st: 0,
    id: null as number | null
  });

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const t = event.target as HTMLElement | null;
      if (t?.closest?.("input, select, textarea, a[href], [data-event-chip]")) return;
      pan.current = {
        active: true,
        panning: false,
        x: event.clientX,
        y: event.clientY,
        sl: pane.scrollLeft,
        st: pane.scrollTop,
        id: event.pointerId
      };
    };
    const onMove = (event: PointerEvent) => {
      if (!pan.current.active || pan.current.id !== event.pointerId) return;
      const dx = event.clientX - pan.current.x;
      const dy = event.clientY - pan.current.y;
      if (!pan.current.panning && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        pan.current.panning = true;
        pane.classList.add("is-panning");
        try {
          pane.setPointerCapture(event.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (!pan.current.panning) return;
      pane.scrollLeft = pan.current.sl - dx;
      pane.scrollTop = pan.current.st - dy;
      event.preventDefault();
    };
    const onUp = (event: PointerEvent) => {
      if (!pan.current.active || pan.current.id !== event.pointerId) return;
      const was = pan.current.panning;
      pan.current.active = false;
      pan.current.panning = false;
      pane.classList.remove("is-panning");
      if (was) {
        const swallow = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        pane.addEventListener("click", swallow, true);
        window.setTimeout(() => pane.removeEventListener("click", swallow, true), 80);
      }
    };
    pane.addEventListener("pointerdown", onDown);
    pane.addEventListener("pointermove", onMove, { passive: false });
    pane.addEventListener("pointerup", onUp);
    pane.addEventListener("pointercancel", onUp);
    return () => {
      pane.removeEventListener("pointerdown", onDown);
      pane.removeEventListener("pointermove", onMove);
      pane.removeEventListener("pointerup", onUp);
      pane.removeEventListener("pointercancel", onUp);
    };
  }, [paneRef]);
}

function eventTone(ev: CalendarEvent): string {
  const content = ev.type === "content" || ev.tone === "sky";
  const indigo = ev.tone === "indigo" || ev.source === "Aurinko" || ev.source === "Calendar";
  if (content) return "bg-sky-500/20 border-sky-500/40";
  if (indigo) return "bg-brand-gold/20 border-brand-gold/40";
  return "bg-amber-500/20 border-amber-500/40";
}

function EventBlock({ ev, compact }: { ev: CalendarEvent; compact?: boolean }) {
  const start = toMinutes(ev.startTime || ev.time);
  const end = Math.max(start + 30, toMinutes(endTimeOf(ev)));
  const top = (start / 60) * HOUR_PX + 1;
  const hgt = Math.max(18, ((end - start) / 60) * HOUR_PX - 3);
  return (
    <button
      type="button"
      data-event-chip
      data-event-id={ev.id}
      onClick={(e) => {
        e.stopPropagation();
        openEvent(ev.id);
      }}
      className={`absolute left-0.5 right-0.5 z-[1] overflow-hidden rounded-md border px-1 text-left hover:brightness-110 ${eventTone(ev)} ${
        ev.cancelled ? "line-through opacity-60" : ""
      }`}
      style={{ top, height: hgt }}
    >
      <div className="truncate pt-0.5 text-[10px] font-semibold leading-tight text-slate-100">{ev.title}</div>
      {!compact ? (
        <div className="font-mono text-[8px] text-slate-300/90">
          {ev.startTime || ev.time}–{endTimeOf(ev)}
        </div>
      ) : null}
    </button>
  );
}

function DayLane({ day, showNow }: { day: Date; showNow?: boolean }) {
  const key = dateKey(day);
  const dayEvents = eventsForDate(key).filter((ev) => !ev.allDay && (ev.startTime || ev.time));
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    if (!showNow) return;
    const tick = () => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [showNow]);

  const nowTop = showNow ? (nowMinutes / 60) * HOUR_PX : null;
  const height = 24 * HOUR_PX;

  return (
    <div className="relative min-w-0" style={{ height }}>
      {HOURS.map((h) => {
        const time = `${String(h).padStart(2, "0")}:00`;
        return (
          <button
            key={h}
            type="button"
            data-cc-hour-slot="1"
            title={`Drag to pan · click to add at ${time}`}
            onClick={() => openComposer(key, time)}
            className="block w-full cursor-grab border-t border-dashed border-slate-800 transition hover:border-amber-500/40 hover:bg-amber-500/5 active:cursor-grabbing"
            style={{ height: HOUR_PX }}
          />
        );
      })}
      {dayEvents.map((ev) => (
        <EventBlock key={ev.id} ev={ev} compact />
      ))}
      {nowTop != null ? (
        <div className="pointer-events-none absolute left-0 right-0 z-[2] flex items-center" style={{ top: nowTop }}>
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-gold shadow-[0_0_8px_rgba(245,185,66,0.7)]" />
          <span className="h-px flex-1 bg-brand-gold/80" />
        </div>
      ) : null}
    </div>
  );
}

function TimeGutter() {
  return (
    <div className="cc-agenda-time-col select-none" style={{ width: TIME_COL }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="border-t border-slate-800/80 font-mono text-[10px] text-slate-500"
          style={{ height: HOUR_PX, lineHeight: `${HOUR_PX}px` }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

function DayTimeline({ day }: { day: Date }) {
  const key = dateKey(day);
  const isToday = isSameDay(day, new Date());
  const paneRef = useRef<HTMLDivElement>(null);
  useHandPan(paneRef);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !isToday) return;
    const hour = new Date().getHours();
    pane.scrollTop = Math.max(0, (hour - 1) * HOUR_PX);
  }, [isToday, key]);

  const holidays = holidaysOnDate(key);
  const allDay = eventsForDate(key).filter((ev) => ev.allDay || (!ev.startTime && !ev.time));
  const bannerItems = [
    ...holidays.map((h) => ({ id: h.id, title: h.title, kind: "holiday" as const })),
    ...allDay.map((ev) => ({ id: ev.id, title: ev.title, kind: "event" as const }))
  ];
  const height = 24 * HOUR_PX;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {bannerItems.length > 0 ? (
        <div className="mb-1.5 flex shrink-0 flex-wrap gap-1">
          {bannerItems.map((item) => (
            <span
              key={item.id}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                item.kind === "holiday"
                  ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                  : "border-brand-gold/35 bg-brand-gold/10 text-brand-gold"
              }`}
            >
              {item.title}
            </span>
          ))}
        </div>
      ) : null}
      <div ref={paneRef} className="cc-agenda-pan relative min-h-0 flex-1 overflow-auto" data-cc-agenda-pan>
        <div className="relative flex" style={{ height }}>
          <TimeGutter />
          <div className="min-w-0 flex-1">
            <DayLane day={day} showNow={isToday} />
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekTimeline({
  days,
  selectedDate,
  onSelectDay
}: {
  days: Date[];
  selectedDate: Date;
  onSelectDay: (day: Date) => void;
}) {
  const paneRef = useRef<HTMLDivElement>(null);
  useHandPan(paneRef);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    const todayIdx = days.findIndex((d) => isSameDay(d, new Date()));
    if (todayIdx >= 0) {
      const hour = new Date().getHours();
      pane.scrollTop = Math.max(0, (hour - 1) * HOUR_PX);
    }
  }, [days]);

  const height = 24 * HOUR_PX;
  const minWidth = TIME_COL + days.length * 110;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={paneRef} className="cc-agenda-pan relative min-h-0 flex-1 overflow-auto" data-cc-agenda-pan>
        <div className="cc-agenda-week" style={{ minWidth }}>
          <div
            className="sticky top-0 z-[3] grid gap-1 bg-[color:var(--bg-card,#0c1220)]/95 pb-1 backdrop-blur-sm"
            style={{ gridTemplateColumns: `${TIME_COL}px repeat(${days.length}, minmax(0, 1fr))` }}
          >
            <div className="cc-agenda-time-col py-1 font-mono text-[9px] text-slate-500">Time</div>
            {days.map((day) => {
              const key = dateKey(day);
              const on = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const holiday = holidaysOnDate(key)[0];
              const allDay = eventsForDate(key).find((ev) => ev.allDay || (!ev.startTime && !ev.time));
              const badge = holiday
                ? { title: holiday.title, kind: "holiday" as const }
                : allDay
                  ? { title: allDay.title, kind: "event" as const }
                  : null;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className={`cc-week-dayhead ${on ? "cc-week-dayhead--on" : ""} ${isToday ? "cc-week-dayhead--today" : ""}`}
                  title={badge ? `${format(day, "EEE d")} · ${badge.title}` : format(day, "EEE d")}
                >
                  <span className="cc-week-dayhead__label">{format(day, "EEE d")}</span>
                  {badge ? (
                    <span
                      className={`cc-week-dayhead__badge ${
                        badge.kind === "event" ? "cc-week-dayhead__badge--event" : ""
                      }`}
                    >
                      {badge.title}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `${TIME_COL}px repeat(${days.length}, minmax(0, 1fr))`,
              height
            }}
          >
            <TimeGutter />
            {days.map((day) => (
              <DayLane key={dateKey(day)} day={day} showNow={isSameDay(day, new Date())} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgendaDateChrome({ title }: { title: string }) {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const jumpToDate = useCalendarStore((s) => s.jumpToDate);
  const nextDay = useCalendarStore((s) => s.nextDay);
  const prevDay = useCalendarStore((s) => s.prevDay);
  const [jumperOpen, setJumperOpen] = useState(false);
  const closeJumper = useCallback(() => setJumperOpen(false), []);

  return (
    <div className="relative z-40 flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={prevDay}
        className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/5"
        aria-label="Previous day"
      >
        ◀
      </button>
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          data-date-jumper-trigger
          onClick={() => setJumperOpen((v) => !v)}
          className="w-full truncate rounded-md px-1 py-0.5 text-left text-sm font-semibold text-slate-100 transition hover:bg-white/[0.04] hover:text-brand-gold"
          aria-expanded={jumperOpen}
        >
          {title}
        </button>
        <DateJumper
          open={jumperOpen}
          onClose={closeJumper}
          value={selectedDate}
          includeDay
          align="left"
          onPick={(date) => jumpToDate(date)}
        />
      </div>
      <button
        type="button"
        onClick={nextDay}
        className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/5"
        aria-label="Next day"
      >
        ▶
      </button>
    </div>
  );
}

export default function CcAgendaTimeline() {
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const agendaMode = useCalendarStore((s) => s.agendaMode);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const ensureVisibleWindow = useCalendarStore((s) => s.ensureVisibleWindow);
  const loadingWindow = useCalendarStore((s) => s.loadingWindow);
  const eventsVersion = useCalendarStore((s) => s.eventsVersion);

  useEffect(() => {
    ensureCalendarIslandCss();
  }, []);

  useEffect(() => {
    void ensureVisibleWindow();
  }, [ensureVisibleWindow, selectedDate]);

  useEffect(() => {
    const onRefresh = () => {
      void useCalendarStore.getState().refreshEvents();
    };
    window.addEventListener("dimad:calendar-refresh", onRefresh);
    return () => window.removeEventListener("dimad:calendar-refresh", onRefresh);
  }, []);

  const title =
    agendaMode === "weekly"
      ? (() => {
          const start = startOfWeek(selectedDate, { weekStartsOn: weekStartsOn() });
          const end = addDays(start, 6);
          return `Week of ${format(start, "MMM d")} – ${format(end, "MMM d")}`;
        })()
      : format(selectedDate, "EEEE, MMM d");

  if (agendaMode === "weekly") {
    const start = startOfWeek(selectedDate, { weekStartsOn: weekStartsOn() });
    const days = eachDayOfInterval({
      start,
      end: endOfWeek(selectedDate, { weekStartsOn: weekStartsOn() })
    });
    return (
      <div className="flex h-full min-h-0 flex-col gap-1.5" data-events-version={eventsVersion}>
        <AgendaDateChrome title={title} />
        <WeekTimeline
          key={`week-${dateKey(start)}-${eventsVersion}`}
          days={days}
          selectedDate={selectedDate}
          onSelectDay={selectDate}
        />
        {loadingWindow ? <span className="sr-only">Loading events</span> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1.5" data-events-version={eventsVersion}>
      <AgendaDateChrome title={title} />
      <DayTimeline key={`${dateKey(selectedDate)}-${eventsVersion}`} day={selectedDate} />
    </div>
  );
}
