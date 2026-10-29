/** All timestamps are epoch milliseconds; all durations are milliseconds. */
export type EpochMs = number;
export type DurationMs = number;

/** Non-negative integer VND; validation belongs to the future service. */
export type MoneyVnd = number;
export type ProductId = string;
export type OwnerId = string;
export type RequestId = string;
export type IdempotencyKey = string;
export type ReservationId = string;
export type OrderId = string;

export interface Product {
  readonly id: ProductId;
  readonly name: string;
  readonly priceVnd: MoneyVnd;
  readonly currency: "VND";
}

export interface SaleConfig {
  readonly product: Product;
  readonly initialStock: number;
  readonly reservationQuantity: 1;
  readonly holdDurationMs: DurationMs;
  /** Reject NEW reservations when now >= saleEndsAt. */
  readonly saleEndsAt: EpochMs;
}

export interface ReservationDetails {
  readonly id: ReservationId;
  readonly productId: ProductId;
  /** Simulated client identity, not authentication or authorization security. */
  readonly ownerId: OwnerId;
  readonly quantity: 1;
  readonly unitPriceVnd: MoneyVnd;
  /** Service grant time; expiry does not start at response receipt. */
  readonly grantedAt: EpochMs;
  readonly expiresAt: EpochMs;
}

export type ActiveReservation = ReservationDetails & {
  readonly status: "active";
};

export type Reservation =
  | ActiveReservation
  | (ReservationDetails & {
      readonly status: "cancelled";
      readonly cancelledAt: EpochMs;
    })
  | (ReservationDetails & { readonly status: "expired" })
  | (ReservationDetails & {
      readonly status: "completed";
      readonly orderId: OrderId;
      readonly completedAt: EpochMs;
    });

export interface Order {
  readonly id: OrderId;
  readonly reservationId: ReservationId;
  readonly ownerId: OwnerId;
  readonly productId: ProductId;
  readonly quantity: 1;
  readonly totalVnd: MoneyVnd;
  readonly currency: "VND";
  readonly createdAt: EpochMs;
}

export interface InventorySnapshot {
  readonly productId: ProductId;
  readonly initialStock: number;
  readonly available: number;
  readonly reserved: number;
  readonly sold: number;
  /** Monotonic inventory revision within one service instance. */
  readonly revision: number;
  readonly observedAt: EpochMs;
}

export interface ServiceSnapshot {
  readonly inventory: InventorySnapshot;
  readonly reservations: readonly Reservation[];
  readonly orders: readonly Order[];
}

export interface RequestIdentity {
  /** New value per attempt, used to reject stale UI responses. */
  readonly requestId: RequestId;
}

export interface IdempotentRequest extends RequestIdentity {
  /** Reuse for retry of the SAME action; new value for a distinct action. */
  readonly idempotencyKey: IdempotencyKey;
}

export interface ReserveRequest extends IdempotentRequest {
  readonly productId: ProductId;
  readonly ownerId: OwnerId;
  readonly quantity: 1;
}

export interface CheckoutRequest extends IdempotentRequest {
  readonly reservationId: ReservationId;
  readonly ownerId: OwnerId;
}

/** Cancel is naturally idempotent by reservationId + ownerId. */
export interface CancelRequest extends RequestIdentity {
  readonly reservationId: ReservationId;
  readonly ownerId: OwnerId;
}

export type ServiceErrorCode =
  | "INVALID_REQUEST"
  | "PRODUCT_NOT_FOUND"
  | "SALE_ENDED"
  | "SOLD_OUT"
  | "RESERVATION_NOT_FOUND"
  | "OWNER_MISMATCH"
  | "RESERVATION_EXPIRED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_COMPLETED"
  | "IDEMPOTENCY_CONFLICT"
  | "SIMULATED_FAILURE"
  | "SERVICE_DISPOSED";

export interface ServiceError {
  readonly code: ServiceErrorCode;
  readonly message: string;
  readonly retryable: boolean;
}

/** Expected domain failures are values; callers still handle unexpected rejection. */
export type ServiceResult<T> =
  | {
      readonly ok: true;
      readonly requestId: RequestId;
      readonly value: T;
    }
  | {
      readonly ok: false;
      readonly requestId: RequestId;
      readonly error: ServiceError;
    };

export interface ReserveReceipt {
  readonly reservation: ActiveReservation;
  readonly inventory: InventorySnapshot;
}

export interface CheckoutReceipt {
  readonly order: Order;
  readonly inventory: InventorySnapshot;
}

export interface CancelReceipt {
  /** Includes already expired holds; completed orders cannot be cancelled here. */
  readonly reservation: Extract<Reservation, { status: "cancelled" | "expired" }>;
  readonly inventory: InventorySnapshot;
}

export interface MockSaleService {
  reserve(request: ReserveRequest): Promise<ServiceResult<ReserveReceipt>>;
  checkout(request: CheckoutRequest): Promise<ServiceResult<CheckoutReceipt>>;
  cancel(request: CancelRequest): Promise<ServiceResult<CancelReceipt>>;
  /** Process due expirations before returning an isolated snapshot. */
  getSnapshot(): ServiceSnapshot;
  /** Explicit lazy-expiry entry point; repeated processing releases at most once. */
  processExpirations(): ServiceSnapshot;
  /** Idempotent; invalidate pending work and clean up owned timers. */
  dispose(): void;
}

export type ServiceOperation = "reserve" | "checkout" | "cancel";
export type Clock = () => EpochMs;

export interface OperationContext extends RequestIdentity {
  readonly operation: ServiceOperation;
  /** Abort waiting work on service disposal; not a domain cancellation. */
  readonly signal: AbortSignal;
}

/** Hooks for the service implementation in Task 4; no behavior is implemented here. */
export interface MockServiceDependencies {
  readonly now?: Clock;
  readonly delay?: (context: OperationContext) => Promise<void>;
  /** Inject failures BEFORE a commit; do not simulate a committed action as failed. */
  readonly failure?: (context: OperationContext) => ServiceError | null;
  /** Return a cancellation function for each scheduled timeout. */
  readonly schedule?: (callback: () => void, delayMs: DurationMs) => () => void;
}

/** UI state is separate from authoritative reservation and inventory records. */
export type ReservationState =
  | { readonly status: "IDLE" }
  | {
      readonly status: "RESERVING";
      readonly requestId: RequestId;
      readonly idempotencyKey: IdempotencyKey;
    }
  | { readonly status: "RESERVED"; readonly reservation: ActiveReservation }
  | {
      readonly status: "CHECKING_OUT";
      readonly reservation: ActiveReservation;
      readonly requestId: RequestId;
      readonly idempotencyKey: IdempotencyKey;
    }
  | {
      readonly status: "CANCELLING";
      readonly reservation: ActiveReservation;
      readonly requestId: RequestId;
    }
  | { readonly status: "SUCCESS"; readonly order: Order }
  | { readonly status: "EXPIRED"; readonly reservation: ReservationDetails }
  | {
      readonly status: "ERROR";
      readonly operation: "reserve";
      readonly requestId: RequestId;
      readonly idempotencyKey: IdempotencyKey;
      readonly error: ServiceError;
    }
  | {
      readonly status: "ERROR";
      readonly operation: "checkout";
      readonly requestId: RequestId;
      readonly idempotencyKey: IdempotencyKey;
      readonly reservation: ActiveReservation;
      readonly error: ServiceError;
    }
  | {
      readonly status: "ERROR";
      readonly operation: "cancel";
      readonly requestId: RequestId;
      readonly reservation: ActiveReservation;
      readonly error: ServiceError;
    };
