"use client";

import { useEffect, useRef } from "react";

type PollingCallback = () => void | Promise<void>;

export function useVisibilityPolling(
  callback: PollingCallback,
  intervalMs = 60_000,
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      if (active) timer = setTimeout(poll, intervalMs);
    };

    const poll = async () => {
      if (!active) return;
      if (document.visibilityState !== "visible") {
        scheduleNext();
        return;
      }

      try {
        await callbackRef.current();
      } finally {
        scheduleNext();
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible" || !active) return;
      void callbackRef.current();
    };

    document.addEventListener("visibilitychange", refreshWhenVisible);
    scheduleNext();

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [intervalMs]);
}
