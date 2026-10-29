import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EpochMs } from "../src/contracts/flash-sale";
import { calculateRemainingTime } from "../src/timer/deadline-countdown";
import { useDeadlineCountdown } from "../src/timer/use-deadline-countdown";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function CountdownProbe({
  initialDeadline,
  clock,
}: {
  readonly initialDeadline: EpochMs;
  readonly clock: () => number;
}) {
  const [deadline, setDeadline] = useState(initialDeadline);
  const remainingMs = useDeadlineCountdown(deadline, clock);

  return (
    <>
      <output data-testid="remaining">{remainingMs}</output>
      <button type="button" onClick={() => setDeadline(2_500)}>
        Change deadline
      </button>
    </>
  );
}

describe("deadline countdown", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root !== undefined) act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
    vi.useRealTimers();
  });

  it("calculates remaining time from an injected clock and clamps at zero", () => {
    expect(calculateRemainingTime(2_500, () => 1_000)).toBe(1_500);
    expect(calculateRemainingTime(2_500, () => 3_000)).toBe(0);
  });

  it("updates from the deadline after a delayed callback and stops at zero", () => {
    vi.useFakeTimers();
    let now = 1_000;
    container = document.createElement("div");
    root = createRoot(container);

    act(() => {
      root?.render(
        <CountdownProbe initialDeadline={2_500} clock={() => now} />,
      );
    });
    expect(container.querySelector("output")?.textContent).toBe("1500");
    expect(vi.getTimerCount()).toBe(1);

    now = 2_600;
    act(() => vi.advanceTimersByTime(1_000));
    expect(container.querySelector("output")?.textContent).toBe("0");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reschedules once when the deadline changes and cleans up on unmount", () => {
    vi.useFakeTimers();
    const now = 1_000;
    container = document.createElement("div");
    root = createRoot(container);
    act(() => {
      root?.render(
        <CountdownProbe initialDeadline={5_000} clock={() => now} />,
      );
    });

    act(() => {
      container?.querySelector("button")?.click();
    });
    expect(container.querySelector("output")?.textContent).toBe("1500");
    expect(vi.getTimerCount()).toBe(1);

    act(() => root?.unmount());
    root = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("refreshes from the deadline when the document becomes visible", () => {
    vi.useFakeTimers();
    let now = 1_000;
    container = document.createElement("div");
    root = createRoot(container);
    act(() => {
      root?.render(
        <CountdownProbe initialDeadline={5_000} clock={() => now} />,
      );
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    now = 4_000;
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(container.querySelector("output")?.textContent).toBe("1000");
    expect(vi.getTimerCount()).toBe(1);
  });
});
