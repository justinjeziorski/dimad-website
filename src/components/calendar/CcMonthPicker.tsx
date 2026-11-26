"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { holidaysInRange } from "@/lib/calendar/holidays";
import { eventsInMonth, monthKey } from "@/lib/calendar/eventsCache";
import { dateKey, useCalendarStore } from "@/lib/calendar/store";
import { ensureCalendarIslandCss } from "@/lib/calendar/calendarIslandCss";
import DateJumper from "@/components/calendar/DateJumper";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function weekStartsOn(): 0 | 1 {
  try {
    const raw = JSON.parse(localStorage.getItem("dimad_cal_settings") || "{}");
    return raw.weekStartsOn === "sunday" ? 0 : 1;
  } catch {
    return 1;
  }
}

export default function CcMonthPicker() {
  const visibleMonth = useCalendarStore((s) => s.visibleMonth);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const loadingWindow = useCalendarStore((s) => s.loadingWindow);
  const eventsVersion = useCalendarStore((s) => s.eventsVersion);
  const selectDate = useCalendarStore((s) => s.selectDate);
  const nextMonth = useCalendarStore((s) => s.nextMonth);
  const prevMonth = useCalendarStore((s) => s.prevMonth);
  const jumpToDate = useCalendarStore((s) => s.jumpToDate);
  const ensureVisibleWindow = useCalendarStore((s) => s.ensureVisibleWindow);

  const [jumperOpen, setJumperOpen] = useState(false);
  const closeJumper = useCallback(() => setJumperOpen(false), []);
  const wheelLock = useRef(0);

  useEffect(() => {
    ensureCalendarIslandCss();
  }, []);

  useEffect(() => {
    void ensureVisibleWindow();
  }, [ensureVisibleWindow, visibleMonth]);

  const startOn = weekStartsOn();
  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: startOn });
    const end = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: startOn });
    return eachDayOfInterval({ start, end });
  }, [visibleMonth, startOn]);

  const monthEvents = eventsInMonth(monthKey(visibleMonth));
  const holidaySet = useMemo(() => {
    const start = startOfMonth(visibleMonth);
    const end = endOfMonth(visibleMonth);
    const map = new Map<string, number>();
    holidaysInRange(start, end).forEach((h) => {
      map.set(h.date, (map.get(h.date) || 0) + 1);
    });
    return map;
  }, [visibleMonth]);

  const eventDays = useMemo(() => {
    const map = new Map<string, number>();
    monthEvents.forEach((ev) => {
      if (ev.cancelled) return;
      map.set(ev.date, (map.get(ev.date) || 0) + 1);
    });
    return map;
  }, [monthEvents, loadingWindow, visibleMonth, eventsVersion]);

  const onWheel = (event: React.WheelEvent) => {
    if (jumperOpen) return;
    const now = Date.now();
    if (now - wheelLock.current < 420) return;
    if (Math.abs(event.deltaY) < 18) return;
    wheelLock.current = now;
    if (event.deltaY > 0) nextMonth();
    else prevMonth();
  };

  const title = format(visibleMonth, "MMMM yyyy");
  const labels = startOn === 1 ? [...WEEKDAYS.slice(1), WEEKDAYS[0]] : WEEKDAYS;

  return (
    <div className="cc-cal-month" onWheel={onWheel}>
      <div className="cc-cal-month__nav">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/5"
          aria-label="Previous month"
        >
          ◀
        </button>
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            data-date-jumper-trigger
            onClick={() => setJumperOpen((v) => !v)}
            className="w-full truncate rounded-md px-1 py-0.5 text-center font-mono text-[10px] font-semibold text-slate-100 transition hover:bg-white/[0.04] hover:text-brand-gold"
            aria-expanded={jumperOpen}
          >
            {title}
          </button>
          <DateJumper
            open={jumperOpen}
            onClose={closeJumper}
            value={visibleMonth}
            includeDay={false}
            onPick={(date) => {
              jumpToDate(startOfMonth(date));
            }}
          />
        </div>
        <button
          type="button"
          onClick={nextMonth}
          className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-slate-300 hover:bg-white/5"
          aria-label="Next month"
        >
          ▶
        </button>
      </div>

      <div className="cc-cal-month__weekdays">
        {labels.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className="cc-cal-month__grid" role="grid" aria-label={title}>
        {gridDays.map((day) => {
          const key = dateKey(day);
          const inMonth = isSameMonth(day, visibleMonth);
          const selected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const hasEvents = (eventDays.get(key) || 0) > 0;
          const hasHoliday = (holidaySet.get(key) || 0) > 0;
          const cls = [
            "cc-cal-month__cell",
            !inMonth ? "cc-cal-month__cell--out" : "",
            isToday ? "cc-cal-month__cell--today" : "",
            selected ? "cc-cal-month__cell--selected" : ""
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-label={format(day, "MMMM d, yyyy")}
              aria-selected={selected}
              onClick={() => {
                selectDate(day);
                setJumperOpen(false);
              }}
              className={cls}
            >
              <span className="cc-cal-month__cell-num">{format(day, "d")}</span>
              {(hasEvents || hasHoliday) && (
                <span className="cc-cal-month__cell-dots" aria-hidden>
                  {hasEvents ? <span className="cc-cal-month__dot cc-cal-month__dot--event" /> : null}
                  {hasHoliday ? <span className="cc-cal-month__dot cc-cal-month__dot--holiday" /> : null}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
