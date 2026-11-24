"use client";

import { useEffect, useState } from "react";

function formatTime(now: Date, tz: string, withSeconds: boolean) {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  if (withSeconds) opts.second = "2-digit";
  return new Intl.DateTimeFormat("en-GB", opts).format(now);
}

function formatDate(now: Date, tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(now);
}

type LiveClockProps = {
  tz: string;
  mode?: "time" | "time-short" | "date";
  className?: string;
  placeholder?: string;
};

/**
 * Isolated 1s ticker — keeps the parent City Header from re-rendering every second.
 */
export default function LiveClock({
  tz,
  mode = "time",
  className,
  placeholder = mode === "date" ? "—" : mode === "time-short" ? "--:--" : "--:--:--"
}: LiveClockProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  let text = placeholder;
  if (now) {
    if (mode === "date") text = formatDate(now, tz);
    else if (mode === "time-short") text = formatTime(now, tz, false);
    else text = formatTime(now, tz, true);
  }

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
