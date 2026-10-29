import { describe, expect, it } from "vitest";
import type {
  OperationContext,
  ReserveRequest,
} from "../src/contracts/flash-sale";
import { createSaleService } from "./fixtures";

function request(index: number, ownerId = `owner-${index}`): ReserveRequest {
  return {
    requestId: `reserve-${index}`,
    idempotencyKey: `reserve-key-${index}`,
    productId: "flash-product",
    ownerId,
    quantity: 1,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("mock sale service invariants", () => {
  it("replays a duplicate reserve request without holding a second unit", async () => {
    const service = createSaleService({ now: () => 1_000 });
    const original = request(1, "same-owner");
    const [first, repeated] = await Promise.all([
      service.reserve(original),
      service.reserve({ ...original, requestId: "reserve-retry" }),
    ]);

    if (!first.ok || !repeated.ok) {
      throw new Error("Expected both idempotent reserve requests to succeed.");
    }
    expect(repeated.value.reservation.id).toBe(first.value.reservation.id);
    expect(service.getSnapshot().inventory).toMatchObject({
      available: 9,
      reserved: 1,
      sold: 0,
    });
    service.dispose();
  });

  it("grants no more than ten holds for twenty concurrent requests", async () => {
    const service = createSaleService({ now: () => 1_000 });
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, index) => service.reserve(request(index))),
    );
    const succeeded = results.filter((result) => result.ok);
    const failures = results.filter((result) => !result.ok);
    const { inventory } = service.getSnapshot();

    expect(succeeded).toHaveLength(10);
    expect(failures).toHaveLength(10);
    expect(failures.every((result) => !result.ok && result.error.code === "SOLD_OUT"))
      .toBe(true);
    expect(inventory).toMatchObject({
      initialStock: 10,
      available: 0,
      reserved: 10,
      sold: 0,
    });
    expect(inventory.available).toBeGreaterThanOrEqual(0);
    service.dispose();
  });

  it("returns inventory at most once across repeated cancel and expiry", async () => {
    let now = 1_000;
    const scheduled: Array<() => void> = [];
    const service = createSaleService({
      now: () => now,
      schedule: (callback) => {
        scheduled.push(callback);
        return () => undefined;
      },
    });
    const reserved = await service.reserve(request(1));
    if (!reserved.ok) throw new Error("Expected reservation to succeed.");

    const cancelRequest = {
      requestId: "cancel-1",
      reservationId: reserved.value.reservation.id,
      ownerId: reserved.value.reservation.ownerId,
    };
    await service.cancel(cancelRequest);
    await service.cancel({ ...cancelRequest, requestId: "cancel-2" });
    now = reserved.value.reservation.expiresAt;
    scheduled[0]?.();
    const { inventory } = service.getSnapshot();

    expect(inventory).toMatchObject({
      initialStock: 10,
      available: 10,
      reserved: 0,
      sold: 0,
    });
    expect(inventory.available + inventory.reserved + inventory.sold).toBe(10);
    service.dispose();
  });

  it("expires a reservation once even when expiration processing repeats", async () => {
    let now = 1_000;
    const service = createSaleService({
      now: () => now,
      schedule: () => () => undefined,
    });
    const reserved = await service.reserve(request(1));
    if (!reserved.ok) throw new Error("Expected reservation to succeed.");

    now = reserved.value.reservation.expiresAt;
    service.processExpirations();
    const firstExpiryRevision = service.getSnapshot().inventory.revision;
    service.processExpirations();
    const snapshot = service.getSnapshot();

    expect(snapshot.inventory.revision).toBe(firstExpiryRevision);
    expect(snapshot.inventory).toMatchObject({
      available: 10,
      reserved: 0,
      sold: 0,
    });
    expect(snapshot.reservations[0]?.status).toBe("expired");
    service.dispose();
  });

  it("makes checkout idempotent and keeps sold inventory when expiry callback fires", async () => {
    let now = 1_000;
    const scheduled: Array<() => void> = [];
    const service = createSaleService({
      now: () => now,
      schedule: (callback) => {
        scheduled.push(callback);
        return () => undefined;
      },
    });
    const reserved = await service.reserve(request(1));
    if (!reserved.ok) throw new Error("Expected reservation to succeed.");

    const checkoutRequest = {
      requestId: "checkout-1",
      idempotencyKey: "checkout-key",
      reservationId: reserved.value.reservation.id,
      ownerId: reserved.value.reservation.ownerId,
    };
    const [first, repeated] = await Promise.all([
      service.checkout(checkoutRequest),
      service.checkout({ ...checkoutRequest, requestId: "checkout-2" }),
    ]);
    if (!first.ok || !repeated.ok) {
      throw new Error("Expected both idempotent checkout requests to succeed.");
    }
    expect(repeated.value.order).toEqual(first.value.order);
    now = reserved.value.reservation.expiresAt;
    scheduled[0]?.();
    const snapshot = service.getSnapshot();

    expect(snapshot.orders).toHaveLength(1);
    expect(snapshot.inventory).toMatchObject({
      available: 9,
      reserved: 0,
      sold: 1,
    });
    service.dispose();
  });

  it("lets expiry win when checkout reaches its decision point at the deadline", async () => {
    let now = 1_000;
    const delayGate = deferred<void>();
    let checkoutStarted = false;
    const service = createSaleService({
      now: () => now,
      delay: async (context: OperationContext) => {
        if (context.operation === "checkout") {
          checkoutStarted = true;
          await delayGate.promise;
        }
      },
      schedule: () => () => undefined,
    });
    const reserved = await service.reserve(request(1));
    if (!reserved.ok) throw new Error("Expected reservation to succeed.");

    const checkoutPromise = service.checkout({
      requestId: "checkout-1",
      idempotencyKey: "checkout-key",
      reservationId: reserved.value.reservation.id,
      ownerId: reserved.value.reservation.ownerId,
    });
    while (!checkoutStarted) await Promise.resolve();
    now = reserved.value.reservation.expiresAt;
    delayGate.resolve();
    const checkout = await checkoutPromise;
    const { inventory } = service.getSnapshot();

    expect(checkout).toMatchObject({
      ok: false,
      error: { code: "RESERVATION_EXPIRED" },
    });
    expect(inventory).toMatchObject({ available: 10, reserved: 0, sold: 0 });
    service.dispose();
  });

  it("rolls no inventory back for an injected pre-commit failure", async () => {
    const service = createSaleService({
      now: () => 1_000,
      failure: (context) =>
        context.operation === "reserve"
          ? {
              code: "SIMULATED_FAILURE",
              message: "Injected failure",
              retryable: true,
            }
          : null,
    });
    const result = await service.reserve(request(1));

    expect(result).toMatchObject({
      ok: false,
      error: { code: "SIMULATED_FAILURE" },
    });
    expect(service.getSnapshot().inventory).toMatchObject({
      available: 10,
      reserved: 0,
      sold: 0,
    });
    service.dispose();
  });

  it("aborts pending work on dispose", async () => {
    let observedSignal: AbortSignal | undefined;
    const delayGate = deferred<void>();
    const service = createSaleService({
      now: () => 1_000,
      delay: async (context: OperationContext) => {
        observedSignal = context.signal;
        await delayGate.promise;
      },
      schedule: () => () => undefined,
    });
    const pending = service.reserve(request(1));
    for (let attempt = 0; observedSignal === undefined && attempt < 10; attempt += 1) {
      await Promise.resolve();
    }

    service.dispose();
    const result = await pending;

    expect(observedSignal?.aborted).toBe(true);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "SERVICE_DISPOSED" },
    });
    delayGate.resolve();
  });

  it("cancels the owned reservation expiry timer on dispose", async () => {
    let cancelled = false;
    const service = createSaleService({
      now: () => 1_000,
      schedule: () => () => {
        cancelled = true;
      },
    });
    const reserved = await service.reserve(request(1));
    if (!reserved.ok) throw new Error("Expected reservation to succeed.");

    service.dispose();

    expect(cancelled).toBe(true);
  });

  it("checks expiry immediately before checkout and preserves the single-winner rule", async () => {
    let now = 1_000;
    const scheduled: Array<() => void> = [];
    const service = createSaleService({
      now: () => now,
      schedule: (callback) => {
        scheduled.push(callback);
        return () => undefined;
      },
    });
    const reserved = await service.reserve(request(1));
    if (!reserved.ok) throw new Error("Expected reservation to succeed.");

    now = reserved.value.reservation.expiresAt - 1;
    const checkout = await service.checkout({
      requestId: "checkout-1",
      idempotencyKey: "checkout-key",
      reservationId: reserved.value.reservation.id,
      ownerId: reserved.value.reservation.ownerId,
    });
    expect(checkout.ok).toBe(true);

    now = reserved.value.reservation.expiresAt;
    scheduled[0]?.();
    expect(service.getSnapshot().inventory).toMatchObject({
      available: 9,
      reserved: 0,
      sold: 1,
    });
    service.dispose();
  });
});
