"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function weekStartsOn(): 0 | 1 {
  try {
    const raw = JSON.parse(localStorage.getItem("dimad_cal_settings") || "{}");
    return raw.weekStartsOn === "sunday" ? 0 : 1;
  } catch {
    return 1;
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  value: Date;
  onPick: (date: Date) => void;
  /** Agenda: also pick a day. Calendar: month/year only. */
  includeDay?: boolean;
  align?: "left" | "center";
};

export default function DateJumper({
  open,
  onClose,
  value,
  onPick,
  includeDay = false,
  align = "center"
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const startOn = weekStartsOn();

  useEffect(() => {
    if (!open) return;
    setYear(value.getFullYear());
    setMonth(value.getMonth());
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (target.closest?.("[data-date-jumper-trigger]")) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const dayCells = useMemo(() => {
    if (!includeDay) return [];
    const cursor = new Date(year, month, 1);
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: startOn });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: startOn });
    return eachDayOfInterval({ start, end });
  }, [includeDay, year, month, startOn]);

  if (!open) return null;

  const alignCls = align === "left" ? "left-0" : "left-1/2 -translate-x-1/2";

  return (
    <div
      ref={panelRef}
      className={`absolute ${alignCls} top-full z-[80] mt-1 w-[14rem] space-y-2 rounded-xl border border-white/15 bg-[#0c1220] p-2.5 shadow-2xl ring-1 ring-black/40`}
      role="dialog"
      aria-label={includeDay ? "Choose date" : "Choose month"}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-300 hover:text-brand-gold"
          onClick={() => setYear((y) => y - 1)}
        >
          ◀
        </button>
        <span className="font-mono text-[11px] font-semibold text-slate-100">{year}</span>
        <button
          type="button"
          className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-slate-300 hover:text-brand-gold"
          onClick={() => setYear((y) => y + 1)}
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {MONTHS.map((name, idx) => {
          const selectedMonth = idx === month;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setMonth(idx);
                if (!includeDay) {
                  const day = Math.min(value.getDate(), getDaysInMonth(new Date(year, idx, 1)));
                  onPick(new Date(year, idx, day));
                  onClose();
                }
              }}
              className={`rounded-md px-1 py-1.5 font-mono text-[9px] transition ${
                selectedMonth
                  ? "bg-brand-gold/20 font-semibold text-brand-gold"
                  : "text-slate-300 hover:bg-white/5 hover:text-brand-gold"
              }`}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {includeDay ? (
        <div className="space-y-1 border-t border-white/10 pt-2">
          <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Day</p>
          <div className="grid grid-cols-7 gap-px text-center font-mono text-[8px] text-slate-500">
            {(startOn === 1 ? [...WEEKDAYS.slice(1), WEEKDAYS[0]] : WEEKDAYS).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {dayCells.map((day) => {
              const inMonth = isSameMonth(day, new Date(year, month, 1));
              const selected = isSameDay(day, value) && inMonth;
              return (
                <button
                  key={format(day, "yyyy-MM-dd")}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => {
                    onPick(day);
                    onClose();
                  }}
                  className={`flex h-6 items-center justify-center rounded text-[10px] tabular-nums ${
                    !inMonth
                      ? "cursor-default text-slate-700"
                      : selected
                        ? "bg-brand-gold/20 font-semibold text-brand-gold"
                        : "text-slate-200 hover:bg-white/5 hover:text-brand-gold"
                  }`}
                >
                  {inMonth ? format(day, "d") : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-md border border-white/10 py-1 text-[9px] font-semibold text-slate-400 hover:text-slate-200"
      >
        Close
      </button>
    </div>
  );
}
