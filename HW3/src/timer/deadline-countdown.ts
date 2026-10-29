import type { Clock, DurationMs, EpochMs } from "../contracts/flash-sale";

export function calculateRemainingTime(
  endTime: EpochMs,
  now: Clock = Date.now,
): DurationMs {
  return Math.max(0, endTime - now());
}
