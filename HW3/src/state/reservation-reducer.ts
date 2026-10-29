import type {
  ActiveReservation,
  CancelReceipt,
  IdempotencyKey,
  Order,
  ReservationDetails,
  ReservationState,
  RequestId,
  ServiceError,
} from "../contracts/flash-sale";

export type ReservationEvent =
  | {
      readonly type: "RESERVE_STARTED";
      readonly requestId: RequestId;
      readonly idempotencyKey: IdempotencyKey;
    }
  | { readonly type: "RESERVE_RETRY_STARTED"; readonly requestId: RequestId }
  | {
      readonly type: "RESERVE_SUCCEEDED";
      readonly requestId: RequestId;
      readonly reservation: ActiveReservation;
    }
  | {
      readonly type: "RESERVE_FAILED";
      readonly requestId: RequestId;
      readonly error: ServiceError;
    }
  | {
      readonly type: "CHECKOUT_STARTED";
      readonly requestId: RequestId;
      readonly idempotencyKey: IdempotencyKey;
    }
  | { readonly type: "CHECKOUT_RETRY_STARTED"; readonly requestId: RequestId }
  | {
      readonly type: "CHECKOUT_SUCCEEDED";
      readonly requestId: RequestId;
      readonly order: Order;
    }
  | {
      readonly type: "CHECKOUT_FAILED";
      readonly requestId: RequestId;
      readonly error: ServiceError;
    }
  | { readonly type: "CANCEL_STARTED"; readonly requestId: RequestId }
  | { readonly type: "CANCEL_RETRY_STARTED"; readonly requestId: RequestId }
  | {
      readonly type: "CANCEL_SUCCEEDED";
      readonly requestId: RequestId;
      readonly reservation: CancelReceipt["reservation"];
    }
  | {
      readonly type: "CANCEL_FAILED";
      readonly requestId: RequestId;
      readonly error: ServiceError;
    }
  | {
      readonly type: "RESERVATION_EXPIRED";
      readonly reservationId: ReservationDetails["id"];
      readonly expiresAt: ReservationDetails["expiresAt"];
    }
  | { readonly type: "RESET" };

function isExpiredError(error: ServiceError): boolean {
  return error.code === "RESERVATION_EXPIRED";
}

function isMatchingReservation(
  reservation: ActiveReservation,
  event: Extract<ReservationEvent, { type: "RESERVATION_EXPIRED" }>,
): boolean {
  return (
    reservation.id === event.reservationId &&
    reservation.expiresAt === event.expiresAt
  );
}

function toExpiredState(
  reservation: ReservationDetails,
): Extract<ReservationState, { status: "EXPIRED" }> {
  const {
    id,
    productId,
    ownerId,
    quantity,
    unitPriceVnd,
    grantedAt,
    expiresAt,
  } = reservation;
  return {
    status: "EXPIRED",
    reservation: {
      id,
      productId,
      ownerId,
      quantity,
      unitPriceVnd,
      grantedAt,
      expiresAt,
    },
  };
}

export function reservationReducer(
  state: ReservationState,
  event: ReservationEvent,
): ReservationState {
  switch (event.type) {
    case "RESERVE_STARTED":
      return state.status === "IDLE"
        ? {
            status: "RESERVING",
            requestId: event.requestId,
            idempotencyKey: event.idempotencyKey,
          }
        : state;

    case "RESERVE_RETRY_STARTED":
      return state.status === "ERROR" && state.operation === "reserve"
        ? {
            status: "RESERVING",
            requestId: event.requestId,
            idempotencyKey: state.idempotencyKey,
          }
        : state;

    case "RESERVE_SUCCEEDED":
      return state.status === "RESERVING" &&
        state.requestId === event.requestId
        ? { status: "RESERVED", reservation: event.reservation }
        : state;

    case "RESERVE_FAILED":
      return state.status === "RESERVING" &&
        state.requestId === event.requestId
        ? {
            status: "ERROR",
            operation: "reserve",
            requestId: state.requestId,
            idempotencyKey: state.idempotencyKey,
            error: event.error,
          }
        : state;

    case "CHECKOUT_STARTED":
      return state.status === "RESERVED"
        ? {
            status: "CHECKING_OUT",
            reservation: state.reservation,
            requestId: event.requestId,
            idempotencyKey: event.idempotencyKey,
          }
        : state;

    case "CHECKOUT_RETRY_STARTED":
      return state.status === "ERROR" && state.operation === "checkout"
        ? {
            status: "CHECKING_OUT",
            reservation: state.reservation,
            requestId: event.requestId,
            idempotencyKey: state.idempotencyKey,
          }
        : state;

    case "CHECKOUT_SUCCEEDED":
      return state.status === "CHECKING_OUT" &&
        state.requestId === event.requestId &&
        state.reservation.id === event.order.reservationId
        ? { status: "SUCCESS", order: event.order }
        : state;

    case "CHECKOUT_FAILED":
      if (
        state.status !== "CHECKING_OUT" ||
        state.requestId !== event.requestId
      ) {
        return state;
      }
      if (isExpiredError(event.error)) return toExpiredState(state.reservation);
      return {
        status: "ERROR",
        operation: "checkout",
        requestId: state.requestId,
        idempotencyKey: state.idempotencyKey,
        reservation: state.reservation,
        error: event.error,
      };

    case "CANCEL_STARTED":
      return state.status === "RESERVED"
        ? {
            status: "CANCELLING",
            reservation: state.reservation,
            requestId: event.requestId,
          }
        : state;

    case "CANCEL_RETRY_STARTED":
      return state.status === "ERROR" && state.operation === "cancel"
        ? {
            status: "CANCELLING",
            reservation: state.reservation,
            requestId: event.requestId,
          }
        : state;

    case "CANCEL_SUCCEEDED":
      if (
        state.status !== "CANCELLING" ||
        state.requestId !== event.requestId ||
        state.reservation.id !== event.reservation.id
      ) {
        return state;
      }
      return event.reservation.status === "expired"
        ? toExpiredState(event.reservation)
        : { status: "IDLE" };

    case "CANCEL_FAILED":
      if (
        state.status !== "CANCELLING" ||
        state.requestId !== event.requestId
      ) {
        return state;
      }
      if (isExpiredError(event.error)) return toExpiredState(state.reservation);
      return {
        status: "ERROR",
        operation: "cancel",
        requestId: state.requestId,
        reservation: state.reservation,
        error: event.error,
      };

    case "RESERVATION_EXPIRED":
      if (
        state.status === "RESERVED" &&
        isMatchingReservation(state.reservation, event)
      ) {
        return toExpiredState(state.reservation);
      }
      if (
        state.status === "ERROR" &&
        (state.operation === "checkout" || state.operation === "cancel") &&
        isMatchingReservation(state.reservation, event)
      ) {
        return toExpiredState(state.reservation);
      }
      return state;

    case "RESET":
      return state.status === "SUCCESS" ||
        state.status === "EXPIRED" ||
        (state.status === "ERROR" && state.operation === "reserve")
        ? { status: "IDLE" }
        : state;
  }
}
