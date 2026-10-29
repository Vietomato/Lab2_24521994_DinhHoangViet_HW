import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MockSaleService,
  MockServiceDependencies,
  SaleConfig,
} from "../src/contracts/flash-sale";

const serviceHarness = vi.hoisted(() => ({
  dependencies: undefined as MockServiceDependencies | undefined,
  service: undefined as MockSaleService | undefined,
}));

vi.mock("../src/service/mock-sale-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/service/mock-sale-service")>();
  return {
    ...actual,
    createMockSaleService: (config: SaleConfig) => {
      const service = actual.createMockSaleService(
        config,
        serviceHarness.dependencies,
      );
      serviceHarness.service = service;
      return service;
    },
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("App lifecycle integration", () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    serviceHarness.dependencies = {
      now: () => 1_000,
      schedule: () => () => undefined,
    };
  });

  afterEach(() => {
    if (root !== undefined) act(() => root?.unmount());
    serviceHarness.service?.dispose();
    container?.remove();
    root = undefined;
    vi.resetModules();
  });

  async function mountApp(): Promise<void> {
    const { default: App } = await import("../src/App");
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });
  }

  function reserveButton(): HTMLButtonElement {
    const button = [...container.querySelectorAll("button")].find((candidate) =>
      candidate.textContent?.includes("Giữ sản phẩm"),
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error("Reserve button was not rendered.");
    }
    return button;
  }

  it("rolls the optimistic stock change back when reserve fails", async () => {
    let releaseReserve: (() => void) | undefined;
    serviceHarness.dependencies = {
      now: () => 1_000,
      schedule: () => () => undefined,
      delay: async (context) => {
        if (context.operation === "reserve") {
          await new Promise<void>((resolve) => {
            releaseReserve = resolve;
          });
        }
      },
      failure: (context) =>
        context.operation === "reserve"
          ? {
              code: "SIMULATED_FAILURE",
              message: "Injected reserve failure",
              retryable: true,
            }
          : null,
    };
    await mountApp();

    await act(async () => {
      reserveButton().click();
      for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
    });
    expect(
      container
        .querySelector('[role="progressbar"][aria-label="Tồn kho còn lại"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("9");

    await act(async () => {
      releaseReserve?.();
      for (let turn = 0; turn < 12; turn += 1) await Promise.resolve();
    });

    expect(
      container
        .querySelector('[role="progressbar"][aria-label="Tồn kho còn lại"]')
        ?.getAttribute("aria-valuenow"),
    ).toBe("10");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Injected reserve failure",
    );
    expect(serviceHarness.service?.getSnapshot().inventory.available).toBe(10);
  });

  it("cancels a late granted reservation after StrictMode unmount", async () => {
    let releaseReserve: (() => void) | undefined;
    serviceHarness.dependencies = {
      now: () => 1_000,
      schedule: () => () => undefined,
      delay: async (context) => {
        if (context.operation === "reserve") {
          await new Promise<void>((resolve) => {
            releaseReserve = resolve;
          });
        }
      },
    };
    await mountApp();

    await act(async () => {
      reserveButton().click();
      for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
    });
    expect(releaseReserve).toBeDefined();

    act(() => root?.unmount());
    root = undefined;
    await act(async () => {
      releaseReserve?.();
      for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
    });

    const snapshot = serviceHarness.service?.getSnapshot();
    expect(snapshot?.inventory).toMatchObject({
      available: 10,
      reserved: 0,
      sold: 0,
    });
    expect(snapshot?.reservations[0]?.status).toBe("cancelled");
  });
});
