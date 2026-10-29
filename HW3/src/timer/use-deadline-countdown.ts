import { useEffect, useState } from "react";
import type { Clock, DurationMs, EpochMs } from "../contracts/flash-sale";
import { calculateRemainingTime } from "./deadline-countdown";

const UPDATE_INTERVAL_MS = 1_000;

interface CountdownSnapshot {
  readonly endTime: EpochMs;
  readonly remainingMs: DurationMs;
}

export function useDeadlineCountdown(
  endTime: EpochMs,
  now: Clock = Date.now,
): DurationMs {
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(() => ({
    endTime,
    remainingMs: calculateRemainingTime(endTime, now),
  }));
  const remainingMs =
    snapshot.endTime === endTime
      ? snapshot.remainingMs
      : calculateRemainingTime(endTime, now);

  useEffect(() => {
    let timeoutId: number | undefined;
    let disposed = false;

    const update = () => {
      if (disposed) return;

      const currentRemainingMs = calculateRemainingTime(endTime, now);
      setSnapshot({ endTime, remainingMs: currentRemainingMs });

      if (currentRemainingMs > 0) {
        timeoutId = window.setTimeout(
          update,
          Math.max(1, Math.min(UPDATE_INTERVAL_MS, currentRemainingMs)),
        );
      }
    };

    const updateWhenVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      update();
    };

    update();
    document.addEventListener("visibilitychange", updateWhenVisible);

    return () => {
      disposed = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", updateWhenVisible);
    };
  }, [endTime, now]);

  return remainingMs;
}
