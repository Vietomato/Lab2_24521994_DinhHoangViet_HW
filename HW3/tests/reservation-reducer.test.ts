import { describe, expect, it } from "vitest";
import type { ReservationState, ServiceError } from "../src/contracts/flash-sale";
import { reservationReducer } from "../src/state/reservation-reducer";
import { activeReservation, order } from "./fixtures";

const error: ServiceError = {
  code: "SIMULATED_FAILURE",
  message: "Injected failure",
  retryable: true,
};

describe("reservation lifecycle reducer", () => {
  it("accepts valid lifecycle events and ignores stale responses", () => {
    let state: ReservationState = { status: "IDLE" };
    state = reservationReducer(state, {
      type: "RESERVE_STARTED",
      requestId: "reserve-1",
      idempotencyKey: "reserve-key-1",
    });
    expect(state.status).toBe("RESERVING");

    const reservingState = state;
    state = reservationReducer(state, {
      type: "RESERVE_SUCCEEDED",
      requestId: "stale-reserve",
      reservation: activeReservation,
    });
    expect(state).toBe(reservingState);

    state = reservationReducer(state, {
      type: "RESERVE_SUCCEEDED",
      requestId: "reserve-1",
      reservation: activeReservation,
    });
    expect(state).toEqual({ status: "RESERVED", reservation: activeReservation });
    state = reservationReducer(state, {
      type: "CHECKOUT_STARTED",
      requestId: "checkout-1",
      idempotencyKey: "checkout-key-1",
    });
    expect(state.status).toBe("CHECKING_OUT");

    const checkingOutState = state;
    state = reservationReducer(state, {
      type: "CHECKOUT_SUCCEEDED",
      requestId: "stale-checkout",
      order,
    });
    expect(state).toBe(checkingOutState);
    state = reservationReducer(state, {
      type: "CHECKOUT_SUCCEEDED",
      requestId: "checkout-1",
      order,
    });
    expect(state).toEqual({ status: "SUCCESS", order });
  });

  it("preserves retry identity, handles cancellation, expiry, and invalid events", () => {
    let state: ReservationState = { status: "IDLE" };
    const idle = state;
    expect(
      reservationReducer(state, {
        type: "CHECKOUT_STARTED",
        requestId: "checkout-1",
        idempotencyKey: "checkout-key-1",
      }),
    ).toBe(idle);

    state = reservationReducer(state, {
      type: "RESERVE_STARTED",
      requestId: "reserve-1",
      idempotencyKey: "reserve-key-1",
    });
    state = reservationReducer(state, {
      type: "RESERVE_FAILED",
      requestId: "reserve-1",
      error,
    });
    state = reservationReducer(state, {
      type: "RESERVE_RETRY_STARTED",
      requestId: "reserve-2",
    });
    expect(state).toMatchObject({
      status: "RESERVING",
      requestId: "reserve-2",
      idempotencyKey: "reserve-key-1",
    });

    state = reservationReducer(state, {
      type: "RESERVE_CANCEL_REQUESTED",
      requestId: "reserve-2",
    });
    expect(state.status).toBe("CANCELLING_RESERVE");
    const cancellingState = state;
    state = reservationReducer(state, {
      type: "RESERVE_CANCELLED",
      requestId: "stale-reserve",
    });
    expect(state).toBe(cancellingState);
    state = reservationReducer(state, {
      type: "RESERVE_CANCELLED",
      requestId: "reserve-2",
    });
    expect(state).toEqual({ status: "IDLE" });

    state = reservationReducer(state, {
      type: "RESERVE_STARTED",
      requestId: "reserve-3",
      idempotencyKey: "reserve-key-3",
    });
    state = reservationReducer(state, {
      type: "RESERVE_SUCCEEDED",
      requestId: "reserve-3",
      reservation: activeReservation,
    });
    state = reservationReducer(state, {
      type: "RESERVATION_EXPIRED",
      reservationId: activeReservation.id,
      expiresAt: activeReservation.expiresAt,
    });
    expect(state.status).toBe("EXPIRED");
  });
});
