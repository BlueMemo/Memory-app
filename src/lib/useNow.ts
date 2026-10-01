"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed every `everyMs` so due counts stay current while a page is open. */
export function useNow(everyMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
