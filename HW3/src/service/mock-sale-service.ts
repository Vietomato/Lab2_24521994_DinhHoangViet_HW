import type {
  ActiveReservation,
  CancelReceipt,
  CancelRequest,
  CheckoutReceipt,
  CheckoutRequest,
  InventorySnapshot,
  MockSaleService,
  MockServiceDependencies,
  Order,
  Reservation,
  ReserveReceipt,
  ReserveRequest,
  SaleConfig,
  ServiceError,
  ServiceErrorCode,
  ServiceOperation,
  ServiceResult,
  ServiceSnapshot,
} from "../contracts/flash-sale";

interface ReserveKeyBinding {
  readonly payload: string;
  readonly reservationId: string;
}

interface CheckoutKeyBinding {
  readonly reservationId: string;
}

interface ExpiryTimer {
  cancel: () => void;
}

const DEFAULT_RESERVATION_QUANTITY = 1;
const DEFAULT_HOLD_DURATION_MS = 30_000;

function createError(
  code: ServiceErrorCode,
  message: string,
  retryable = false,
): ServiceError {
  return { code, message, retryable };
}

function failure<T>(
  requestId: string,
  error: ServiceError,
): ServiceResult<T> {
  return { ok: false, requestId, error };
}

function success<T>(requestId: string, value: T): ServiceResult<T> {
  return { ok: true, requestId, value };
}

function cloneReservation(reservation: Reservation): Reservation {
  return { ...reservation };
}

function validateConfig(config: SaleConfig): void {
  if (
    config.product.id.length === 0 ||
    config.product.name.length === 0 ||
    !Number.isSafeInteger(config.product.priceVnd) ||
    config.product.priceVnd < 0 ||
    config.product.currency !== "VND" ||
    !Number.isSafeInteger(config.initialStock) ||
    config.initialStock !== 10 ||
    config.reservationQuantity !== DEFAULT_RESERVATION_QUANTITY ||
    config.holdDurationMs !== DEFAULT_HOLD_DURATION_MS ||
    !Number.isFinite(config.saleEndsAt)
  ) {
    throw new RangeError("Invalid sale configuration.");
  }
}

function validateIdentity(
  requestId: string,
  ownerId: string,
): ServiceError | null {
  if (requestId.length === 0 || ownerId.length === 0) {
    return createError("INVALID_REQUEST", "Request and owner IDs are required.");
  }
  return null;
}

export function createMockSaleService(
  config: SaleConfig,
  dependencies: MockServiceDependencies = {},
): MockSaleService {
  validateConfig(config);

  const now = dependencies.now ?? Date.now;
  const delay = dependencies.delay ?? (() => Promise.resolve());
  const pendingControllers = new Set<AbortController>();
  const reservations = new Map<string, Reservation>();
  const orders = new Map<string, Order>();
  const reserveKeys = new Map<string, ReserveKeyBinding>();
  const checkoutKeys = new Map<string, CheckoutKeyBinding>();
  const expiryTimers = new Map<string, ExpiryTimer>();

  let available = config.initialStock;
  let reserved = 0;
  let sold = 0;
  let revision = 0;
  let nextReservationId = 1;
  let nextOrderId = 1;
  let disposed = false;

  const inventorySnapshot = (observedAt: number): InventorySnapshot => ({
    productId: config.product.id,
    initialStock: config.initialStock,
    available,
    reserved,
    sold,
    revision,
    observedAt,
  });

  const cancelExpiryTimer = (reservationId: string): void => {
    const timer = expiryTimers.get(reservationId);
    if (timer === undefined) return;
    expiryTimers.delete(reservationId);
    timer.cancel();
  };

  const processExpirationsAt = (at: number): void => {
    for (const [reservationId, reservation] of reservations) {
      if (
        reservation.status !== "active" ||
        at < reservation.expiresAt
      ) {
        continue;
      }

      reservations.set(reservationId, {
        ...reservation,
        status: "expired",
      });
      available += reservation.quantity;
      reserved -= reservation.quantity;
      revision += 1;
      cancelExpiryTimer(reservationId);
    }
  };

  const getSnapshot = (): ServiceSnapshot => {
    if (disposed) {
      throw new DOMException("The mock sale service is disposed.", "InvalidStateError");
    }
    const observedAt = now();
    processExpirationsAt(observedAt);
    return {
      inventory: inventorySnapshot(observedAt),
      reservations: [...reservations.values()].map(cloneReservation),
      orders: [...orders.values()].map((order) => ({ ...order })),
    };
  };

  const processExpirations = (): ServiceSnapshot => getSnapshot();

  const makeContext = (
    operation: ServiceOperation,
    requestId: string,
    controller: AbortController,
  ) => ({ operation, requestId, signal: controller.signal });

  const waitForOperation = async (
    operation: ServiceOperation,
    requestId: string,
  ): Promise<AbortController | null> => {
    if (disposed) return null;

    const controller = new AbortController();
    pendingControllers.add(controller);
    const context = makeContext(operation, requestId, controller);

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (rejected: boolean, error?: unknown) => {
          if (settled) return;
          settled = true;
          controller.signal.removeEventListener("abort", onAbort);
          if (rejected) reject(error);
          else resolve();
        };
        const onAbort = () => finish(false);

        controller.signal.addEventListener("abort", onAbort, { once: true });
        Promise.resolve()
          .then(() => delay(context))
          .then(
            () => finish(false),
            (error: unknown) => finish(true, error),
          );
      });
    } catch (error) {
      pendingControllers.delete(controller);
      if (disposed || controller.signal.aborted) return null;
      throw error;
    }

    if (disposed || controller.signal.aborted) {
      pendingControllers.delete(controller);
      return null;
    }
    return controller;
  };

  const finishOperation = (controller: AbortController): void => {
    pendingControllers.delete(controller);
  };

  const injectedFailure = (
    operation: ServiceOperation,
    requestId: string,
    signal: AbortSignal,
  ): ServiceError | null =>
    dependencies.failure?.({
      operation,
      requestId,
      signal,
    }) ?? null;

  const disposedResult = <T>(requestId: string): ServiceResult<T> =>
    failure(
      requestId,
      createError("SERVICE_DISPOSED", "The mock sale service is disposed."),
    );

  const reservationError = (
    reservation: Reservation,
  ): ServiceError | null => {
    switch (reservation.status) {
      case "active":
        return null;
      case "cancelled":
        return createError(
          "RESERVATION_CANCELLED",
          "This reservation was cancelled.",
        );
      case "expired":
        return createError("RESERVATION_EXPIRED", "This reservation has expired.");
      case "completed":
        return createError(
          "RESERVATION_COMPLETED",
          "This reservation has already been checked out.",
        );
    }
  };

  const reserve = async (
    request: ReserveRequest,
  ): Promise<ServiceResult<ReserveReceipt>> => {
    if (disposed) return disposedResult(request.requestId);
    const invalidIdentity = validateIdentity(request.requestId, request.ownerId);
    if (invalidIdentity !== null) return failure(request.requestId, invalidIdentity);
    if (request.idempotencyKey.length === 0) {
      return failure(
        request.requestId,
        createError("INVALID_REQUEST", "An idempotency key is required."),
      );
    }

    const controller = await waitForOperation("reserve", request.requestId);
    if (controller === null) return disposedResult(request.requestId);

    try {
      const decisionTime = now();
      processExpirationsAt(decisionTime);

      const scopedKey = JSON.stringify([request.ownerId, request.idempotencyKey]);
      const binding = reserveKeys.get(scopedKey);
      const payload = JSON.stringify([request.productId, request.quantity]);
      if (binding !== undefined) {
        if (binding.payload !== payload) {
          return failure(
            request.requestId,
            createError(
              "IDEMPOTENCY_CONFLICT",
              "This reserve key was used with a different payload.",
            ),
          );
        }
        const existing = reservations.get(binding.reservationId);
        if (existing === undefined) {
          throw new Error("Reserve idempotency binding has no reservation.");
        }
        const terminalError = reservationError(existing);
        if (terminalError !== null) return failure(request.requestId, terminalError);
        if (existing.status !== "active") {
          throw new Error("Reservation state changed during reserve replay.");
        }
        return success(request.requestId, {
          reservation: { ...existing },
          inventory: inventorySnapshot(decisionTime),
        });
      }

      if (request.productId !== config.product.id) {
        return failure(
          request.requestId,
          createError("PRODUCT_NOT_FOUND", "The requested product does not exist."),
        );
      }
      if (request.quantity !== config.reservationQuantity) {
        return failure(
          request.requestId,
          createError("INVALID_REQUEST", "Reservation quantity must be one."),
        );
      }

      if (decisionTime >= config.saleEndsAt) {
        return failure(
          request.requestId,
          createError("SALE_ENDED", "The sale has ended."),
        );
      }
      if (available < request.quantity) {
        return failure(
          request.requestId,
          createError("SOLD_OUT", "No inventory is available."),
        );
      }

      const injected = injectedFailure(
        "reserve",
        request.requestId,
        controller.signal,
      );
      if (injected !== null) return failure(request.requestId, injected);

      const reservationId = `reservation-${nextReservationId}`;
      const reservation: ActiveReservation = {
        id: reservationId,
        productId: config.product.id,
        ownerId: request.ownerId,
        quantity: config.reservationQuantity,
        unitPriceVnd: config.product.priceVnd,
        grantedAt: decisionTime,
        expiresAt: decisionTime + config.holdDurationMs,
        status: "active",
      };

      let schedulingComplete = false;
      let firedSynchronously = false;
      const timerHandle: ExpiryTimer = { cancel: () => undefined };
      const schedule =
        dependencies.schedule ??
        ((callback: () => void, delayMs: number) => {
          const timer = globalThis.setTimeout(callback, delayMs);
          return () => globalThis.clearTimeout(timer);
        });
      const cancelTimer = schedule(() => {
        if (!schedulingComplete) {
          firedSynchronously = true;
          return;
        }
        if (disposed || reservations.get(reservationId)?.status !== "active") {
          return;
        }
        expiryTimers.delete(reservationId);
        processExpirationsAt(now());
      }, Math.max(0, reservation.expiresAt - decisionTime));
      schedulingComplete = true;
      if (firedSynchronously) {
        cancelTimer();
        throw new Error("Expiry scheduler must defer callbacks.");
      }
      timerHandle.cancel = cancelTimer;

      available -= reservation.quantity;
      reserved += reservation.quantity;
      revision += 1;
      reservations.set(reservationId, reservation);
      reserveKeys.set(scopedKey, { payload, reservationId });
      nextReservationId += 1;
      expiryTimers.set(reservationId, timerHandle);

      return success(request.requestId, {
        reservation: { ...reservation },
        inventory: inventorySnapshot(decisionTime),
      });
    } finally {
      finishOperation(controller);
    }
  };

  const checkout = async (
    request: CheckoutRequest,
  ): Promise<ServiceResult<CheckoutReceipt>> => {
    if (disposed) return disposedResult(request.requestId);
    const invalidIdentity = validateIdentity(request.requestId, request.ownerId);
    if (invalidIdentity !== null) return failure(request.requestId, invalidIdentity);
    if (request.idempotencyKey.length === 0 || request.reservationId.length === 0) {
      return failure(
        request.requestId,
        createError("INVALID_REQUEST", "Checkout identity fields are required."),
      );
    }

    const controller = await waitForOperation("checkout", request.requestId);
    if (controller === null) return disposedResult(request.requestId);

    try {
      const decisionTime = now();
      processExpirationsAt(decisionTime);

      const scopedKey = JSON.stringify([request.ownerId, request.idempotencyKey]);
      const binding = checkoutKeys.get(scopedKey);
      if (
        binding !== undefined &&
        binding.reservationId !== request.reservationId
      ) {
        return failure(
          request.requestId,
          createError(
            "IDEMPOTENCY_CONFLICT",
            "This checkout key is bound to another reservation.",
          ),
        );
      }

      const reservation = reservations.get(request.reservationId);
      if (reservation === undefined) {
        return failure(
          request.requestId,
          createError(
            "RESERVATION_NOT_FOUND",
            "The requested reservation does not exist.",
          ),
        );
      }
      if (reservation.ownerId !== request.ownerId) {
        return failure(
          request.requestId,
          createError("OWNER_MISMATCH", "This reservation belongs to another owner."),
        );
      }

      if (reservation.status === "completed") {
        const order = orders.get(reservation.orderId);
        if (order === undefined) {
          throw new Error("Completed reservation has no order.");
        }
        checkoutKeys.set(scopedKey, { reservationId: reservation.id });
        return success(request.requestId, {
          order: { ...order },
          inventory: inventorySnapshot(decisionTime),
        });
      }

      const terminalError = reservationError(reservation);
      if (terminalError !== null) return failure(request.requestId, terminalError);

      const injected = injectedFailure(
        "checkout",
        request.requestId,
        controller.signal,
      );
      if (injected !== null) return failure(request.requestId, injected);

      if (reservation.status !== "active") {
        throw new Error("Reservation state changed during checkout decision.");
      }
      const activeReservation = reservation;
      const order: Order = {
        id: `order-${nextOrderId}`,
        reservationId: activeReservation.id,
        ownerId: activeReservation.ownerId,
        productId: activeReservation.productId,
        quantity: activeReservation.quantity,
        totalVnd: activeReservation.unitPriceVnd * activeReservation.quantity,
        currency: config.product.currency,
        createdAt: decisionTime,
      };

      reservations.set(activeReservation.id, {
        ...activeReservation,
        status: "completed",
        orderId: order.id,
        completedAt: decisionTime,
      });
      orders.set(order.id, order);
      checkoutKeys.set(scopedKey, { reservationId: activeReservation.id });
      reserved -= activeReservation.quantity;
      sold += activeReservation.quantity;
      revision += 1;
      nextOrderId += 1;
      cancelExpiryTimer(activeReservation.id);

      return success(request.requestId, {
        order: { ...order },
        inventory: inventorySnapshot(decisionTime),
      });
    } finally {
      finishOperation(controller);
    }
  };

  const cancel = async (
    request: CancelRequest,
  ): Promise<ServiceResult<CancelReceipt>> => {
    if (disposed) return disposedResult(request.requestId);
    const invalidIdentity = validateIdentity(request.requestId, request.ownerId);
    if (invalidIdentity !== null) return failure(request.requestId, invalidIdentity);
    if (request.reservationId.length === 0) {
      return failure(
        request.requestId,
        createError("INVALID_REQUEST", "A reservation ID is required."),
      );
    }

    const controller = await waitForOperation("cancel", request.requestId);
    if (controller === null) return disposedResult(request.requestId);

    try {
      const decisionTime = now();
      processExpirationsAt(decisionTime);

      const reservation = reservations.get(request.reservationId);
      if (reservation === undefined) {
        return failure(
          request.requestId,
          createError(
            "RESERVATION_NOT_FOUND",
            "The requested reservation does not exist.",
          ),
        );
      }
      if (reservation.ownerId !== request.ownerId) {
        return failure(
          request.requestId,
          createError("OWNER_MISMATCH", "This reservation belongs to another owner."),
        );
      }
      if (reservation.status === "cancelled" || reservation.status === "expired") {
        return success(request.requestId, {
          reservation: { ...reservation },
          inventory: inventorySnapshot(decisionTime),
        });
      }
      if (reservation.status === "completed") {
        return failure(
          request.requestId,
          createError(
            "RESERVATION_COMPLETED",
            "A completed reservation cannot be cancelled.",
          ),
        );
      }

      const injected = injectedFailure(
        "cancel",
        request.requestId,
        controller.signal,
      );
      if (injected !== null) return failure(request.requestId, injected);

      const cancelledReservation = {
        ...reservation,
        status: "cancelled" as const,
        cancelledAt: decisionTime,
      };
      reservations.set(reservation.id, cancelledReservation);
      available += reservation.quantity;
      reserved -= reservation.quantity;
      revision += 1;
      cancelExpiryTimer(reservation.id);

      return success(request.requestId, {
        reservation: { ...cancelledReservation },
        inventory: inventorySnapshot(decisionTime),
      });
    } finally {
      finishOperation(controller);
    }
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const controller of pendingControllers) controller.abort();
    pendingControllers.clear();
    for (const reservationId of expiryTimers.keys()) {
      cancelExpiryTimer(reservationId);
    }
  };

  return {
    reserve,
    checkout,
    cancel,
    getSnapshot,
    processExpirations,
    dispose,
  };
}
