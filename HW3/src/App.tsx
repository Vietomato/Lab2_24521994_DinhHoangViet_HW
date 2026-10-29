import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type {
  ActiveReservation,
  InventorySnapshot,
  ReservationState,
  ServiceError,
} from "./contracts/flash-sale";
import "./App.css";
import "./index.css";
import { createMockSaleService } from "./service/mock-sale-service";
import {
  reservationReducer,
  type ReservationEvent,
} from "./state/reservation-reducer";
import { useDeadlineCountdown } from "./timer/use-deadline-countdown";

const PRODUCT = {
  id: "flash-product",
  name: "Tai nghe không dây",
  priceVnd: 1_290_000,
  currency: "VND" as const,
};
const SALE_DURATION_MS = 10 * 60_000;
const SALE_ENDS_AT = Date.now() + SALE_DURATION_MS;
const OWNER_ID = "demo-shopper";

const service = createMockSaleService({
  product: PRODUCT,
  initialStock: 10,
  reservationQuantity: 1,
  holdDurationMs: 30_000,
  saleEndsAt: SALE_ENDS_AT,
});

let identitySequence = 0;

function nextIdentity(prefix: string): string {
  identitySequence += 1;
  return `${prefix}-${identitySequence}`;
}

function getReservation(
  state: ReservationState,
): ActiveReservation | null {
  switch (state.status) {
    case "RESERVED":
    case "CHECKING_OUT":
    case "CANCELLING":
      return state.reservation;
    case "ERROR":
      return state.operation === "reserve" ? null : state.reservation;
    default:
      return null;
  }
}

function formatDuration(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const formatPrice = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function unexpectedError(error: unknown): ServiceError {
  return {
    code: "SIMULATED_FAILURE",
    message:
      error instanceof Error
        ? error.message
        : "Đã xảy ra lỗi không xác định khi xử lý yêu cầu.",
    retryable: true,
  };
}

function isOperationActive(
  state: ReservationState,
  operation: "reserve" | "checkout" | "cancel",
  requestId: string,
): boolean {
  if (state.status === "RESERVING") {
    return operation === "reserve" && state.requestId === requestId;
  }
  if (state.status === "CHECKING_OUT") {
    return operation === "checkout" && state.requestId === requestId;
  }
  if (state.status === "CANCELLING") {
    return operation === "cancel" && state.requestId === requestId;
  }
  return false;
}

interface ConcurrencyDemoResult {
  readonly succeeded: number;
  readonly failed: number;
  readonly startingAvailable: number;
  readonly finalAvailable: number;
  readonly finalReserved: number;
  readonly finalSold: number;
  readonly elapsedMs: number;
  readonly failureCodes: readonly string[];
  readonly expiresAt: number | null;
}

async function releaseOrphanedReservation(
  reservation: ActiveReservation,
): Promise<void> {
  try {
    const result = await service.cancel({
      requestId: nextIdentity("orphan-cleanup"),
      reservationId: reservation.id,
      ownerId: reservation.ownerId,
    });
    if (!result.ok) {
      console.error("Could not release an orphaned reservation:", result.error);
    }
  } catch (error) {
    console.error("Could not release an orphaned reservation:", error);
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reservationReducer, { status: "IDLE" });
  const stateRef = useRef<ReservationState>(state);
  const mountedRef = useRef(false);
  const [confirmedInventory, setConfirmedInventory] = useState<InventorySnapshot>(
    () => service.getSnapshot().inventory,
  );
  const [optimisticAvailableDelta, setOptimisticAvailableDelta] = useState(0);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<ConcurrencyDemoResult | null>(null);
  const demoRunningRef = useRef(false);

  const remainingSaleMs = useDeadlineCountdown(SALE_ENDS_AT);
  const reservation = getReservation(state);
  const remainingHoldMs = useDeadlineCountdown(reservation?.expiresAt ?? 0);
  const displayedAvailable = Math.max(
    0,
    confirmedInventory.available + optimisticAvailableDelta,
  );

  const transition = useCallback(
    (event: ReservationEvent): ReservationState => {
      const nextState = reservationReducer(stateRef.current, event);
      stateRef.current = nextState;
      dispatch(event);
      return nextState;
    },
    [],
  );

  const reconcileInventory = useCallback((): void => {
    if (!mountedRef.current) return;
    try {
      setConfirmedInventory(service.getSnapshot().inventory);
    } catch (error) {
      console.error("Could not refresh service inventory:", error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const disposeService = () => service.dispose();
    window.addEventListener("pagehide", disposeService);
    return () => {
      mountedRef.current = false;
      window.removeEventListener("pagehide", disposeService);
    };
  }, []);

  useEffect(() => {
    if (
      reservation === null ||
      remainingHoldMs > 0 ||
      state.status === "CHECKING_OUT" ||
      state.status === "CANCELLING"
    ) {
      return;
    }

    const expiryTimeout = window.setTimeout(() => {
      reconcileInventory();
      transition({
        type: "RESERVATION_EXPIRED",
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt,
      });
    }, 0);
    return () => window.clearTimeout(expiryTimeout);
  }, [reconcileInventory, remainingHoldMs, reservation, state.status, transition]);

  useEffect(() => {
    if (demoResult === null || demoResult.expiresAt === null) return;
    const refreshDelay = Math.max(0, demoResult.expiresAt - Date.now()) + 5;
    const refreshTimeout = window.setTimeout(reconcileInventory, refreshDelay);
    return () => window.clearTimeout(refreshTimeout);
  }, [demoResult, reconcileInventory]);

  const reserve = async (retry = false): Promise<void> => {
    const current = stateRef.current;
    if (
      demoRunningRef.current ||
      (retry && (current.status !== "ERROR" || current.operation !== "reserve")) ||
      (!retry && current.status !== "IDLE") ||
      remainingSaleMs <= 0
    ) {
      return;
    }

    const requestId = nextIdentity("reserve");
    const idempotencyKey =
      retry && current.status === "ERROR" && current.operation === "reserve"
        ? current.idempotencyKey
        : nextIdentity("reserve-key");
    transition(
      retry
        ? { type: "RESERVE_RETRY_STARTED", requestId }
        : { type: "RESERVE_STARTED", requestId, idempotencyKey },
    );
    setOptimisticAvailableDelta(-1);

    try {
      const result = await service.reserve({
        requestId,
        idempotencyKey,
        productId: PRODUCT.id,
        ownerId: OWNER_ID,
        quantity: 1,
      });

      if (!mountedRef.current) {
        if (result.ok) await releaseOrphanedReservation(result.value.reservation);
        return;
      }

      const currentAfterResponse = stateRef.current;
      if (
        currentAfterResponse.status === "CANCELLING_RESERVE" &&
        currentAfterResponse.requestId === requestId
      ) {
        if (!result.ok) {
          transition({ type: "RESERVE_CANCELLED", requestId });
          setOptimisticAvailableDelta(0);
          reconcileInventory();
          return;
        }

        const cleanupRequestId = nextIdentity("cancel-reserve");
        transition({
          type: "RESERVE_CLEANUP_STARTED",
          requestId,
          cleanupRequestId,
          reservation: result.value.reservation,
        });
        try {
          const cancellation = await service.cancel({
            requestId: cleanupRequestId,
            reservationId: result.value.reservation.id,
            ownerId: result.value.reservation.ownerId,
          });
          if (!mountedRef.current) return;
          if (!isOperationActive(stateRef.current, "cancel", cleanupRequestId)) return;

          if (cancellation.ok) {
            transition({
              type: "CANCEL_SUCCEEDED",
              requestId: cleanupRequestId,
              reservation: cancellation.value.reservation,
            });
            setConfirmedInventory(cancellation.value.inventory);
          } else {
            transition({
              type: "CANCEL_FAILED",
              requestId: cleanupRequestId,
              error: cancellation.error,
            });
            reconcileInventory();
          }
          setOptimisticAvailableDelta(0);
        } catch (error) {
          if (
            mountedRef.current &&
            isOperationActive(stateRef.current, "cancel", cleanupRequestId)
          ) {
            transition({
              type: "CANCEL_FAILED",
              requestId: cleanupRequestId,
              error: unexpectedError(error),
            });
            reconcileInventory();
            setOptimisticAvailableDelta(0);
          } else if (!mountedRef.current) {
            console.error("Reserve cleanup failed after the page was unmounted:", error);
          }
        }
        return;
      }

      if (!isOperationActive(stateRef.current, "reserve", requestId)) {
        if (result.ok) await releaseOrphanedReservation(result.value.reservation);
        setOptimisticAvailableDelta(0);
        reconcileInventory();
        return;
      }

      if (result.ok) {
        transition({
          type: "RESERVE_SUCCEEDED",
          requestId,
          reservation: result.value.reservation,
        });
        setConfirmedInventory(result.value.inventory);
      } else {
        transition({ type: "RESERVE_FAILED", requestId, error: result.error });
        reconcileInventory();
      }
      setOptimisticAvailableDelta(0);
    } catch (error) {
      if (
        mountedRef.current &&
        stateRef.current.status === "CANCELLING_RESERVE" &&
        stateRef.current.requestId === requestId
      ) {
        transition({ type: "RESERVE_CANCELLED", requestId });
        reconcileInventory();
        setOptimisticAvailableDelta(0);
        console.error("Reserve request failed after cancellation was requested:", error);
        return;
      }
      if (mountedRef.current && isOperationActive(stateRef.current, "reserve", requestId)) {
        transition({
          type: "RESERVE_FAILED",
          requestId,
          error: unexpectedError(error),
        });
        reconcileInventory();
        setOptimisticAvailableDelta(0);
      } else if (!mountedRef.current) {
        console.error("Reserve request failed after the page was unmounted:", error);
      }
    }
  };

  const requestCancelPendingReserve = (): void => {
    const current = stateRef.current;
    if (current.status !== "RESERVING" || demoRunningRef.current) return;
    transition({
      type: "RESERVE_CANCEL_REQUESTED",
      requestId: current.requestId,
    });
  };

  const runConcurrencyDemo = async (): Promise<void> => {
    if (
      demoRunningRef.current ||
      isPending ||
      reservation !== null ||
      stateRef.current.status === "CANCELLING_RESERVE"
    ) {
      return;
    }

    demoRunningRef.current = true;
    setDemoRunning(true);
    setDemoResult(null);
    const startedAt = Date.now();
    let startingAvailable: number;

    try {
      startingAvailable = service.getSnapshot().inventory.available;
    } catch (error) {
      demoRunningRef.current = false;
      setDemoRunning(false);
      console.error("Could not start the concurrency demonstration:", error);
      return;
    }

    const runId = nextIdentity("concurrency-demo");
    const requests = Array.from({ length: 20 }, (_, index) => ({
      requestId: `${runId}-request-${index + 1}`,
      idempotencyKey: `${runId}-key-${index + 1}`,
      ownerId: `${runId}-owner-${index + 1}`,
      productId: PRODUCT.id,
      quantity: 1 as const,
    }));

    try {
      const outcomes = await Promise.allSettled(
        requests.map((request) => service.reserve(request)),
      );
      let succeeded = 0;
      let expiresAt: number | null = null;
      const failureCodes: string[] = [];

      for (const outcome of outcomes) {
        if (outcome.status === "rejected") {
          failureCodes.push("UNEXPECTED_ERROR");
          console.error("Concurrency demonstration request rejected:", outcome.reason);
        } else if (outcome.value.ok) {
          succeeded += 1;
          expiresAt =
            expiresAt === null
              ? outcome.value.value.reservation.expiresAt
              : Math.max(expiresAt, outcome.value.value.reservation.expiresAt);
        } else {
          failureCodes.push(outcome.value.error.code);
        }
      }

      const finalSnapshot = service.getSnapshot();
      if (!mountedRef.current) return;
      setConfirmedInventory(finalSnapshot.inventory);
      setDemoResult({
        succeeded,
        failed: outcomes.length - succeeded,
        startingAvailable,
        finalAvailable: finalSnapshot.inventory.available,
        finalReserved: finalSnapshot.inventory.reserved,
        finalSold: finalSnapshot.inventory.sold,
        elapsedMs: Date.now() - startedAt,
        failureCodes,
        expiresAt,
      });
    } catch (error) {
      console.error("Could not complete the concurrency demonstration:", error);
      if (mountedRef.current) {
        let finalInventory = confirmedInventory;
        try {
          finalInventory = service.getSnapshot().inventory;
        } catch (snapshotError) {
          console.error("Could not refresh inventory after the demo failed:", snapshotError);
        }
        setDemoResult({
          succeeded: 0,
          failed: requests.length,
          startingAvailable,
          finalAvailable: finalInventory.available,
          finalReserved: finalInventory.reserved,
          finalSold: finalInventory.sold,
          elapsedMs: Date.now() - startedAt,
          failureCodes: ["DEMO_ERROR"],
          expiresAt: null,
        });
        setConfirmedInventory(finalInventory);
      }
    } finally {
      demoRunningRef.current = false;
      if (mountedRef.current) setDemoRunning(false);
    }
  };

  const checkout = async (retry = false): Promise<void> => {
    const current = stateRef.current;
    if (demoRunningRef.current) return;
    const canStart = current.status === "RESERVED";
    const canRetry =
      current.status === "ERROR" && current.operation === "checkout";
    if ((!retry && !canStart) || (retry && !canRetry)) return;

    const requestId = nextIdentity("checkout");
    const reservationForRequest =
      retry && current.status === "ERROR" && current.operation === "checkout"
        ? current.reservation
        : current.status === "RESERVED"
          ? current.reservation
          : null;
    if (reservationForRequest === null) return;

    const idempotencyKey =
      retry && current.status === "ERROR" && current.operation === "checkout"
        ? current.idempotencyKey
        : nextIdentity("checkout-key");
    transition(
      retry
        ? { type: "CHECKOUT_RETRY_STARTED", requestId }
        : { type: "CHECKOUT_STARTED", requestId, idempotencyKey },
    );

    try {
      const result = await service.checkout({
        requestId,
        idempotencyKey,
        reservationId: reservationForRequest.id,
        ownerId: reservationForRequest.ownerId,
      });

      if (!mountedRef.current || !isOperationActive(stateRef.current, "checkout", requestId)) {
        return;
      }

      if (result.ok) {
        transition({
          type: "CHECKOUT_SUCCEEDED",
          requestId,
          order: result.value.order,
        });
        setConfirmedInventory(result.value.inventory);
      } else {
        transition({ type: "CHECKOUT_FAILED", requestId, error: result.error });
        reconcileInventory();
      }
    } catch (error) {
      if (mountedRef.current && isOperationActive(stateRef.current, "checkout", requestId)) {
        transition({
          type: "CHECKOUT_FAILED",
          requestId,
          error: unexpectedError(error),
        });
        reconcileInventory();
      } else if (!mountedRef.current) {
        console.error("Checkout request failed after the page was unmounted:", error);
      }
    }
  };

  const cancel = async (retry = false): Promise<void> => {
    const current = stateRef.current;
    if (demoRunningRef.current) return;
    const canStart = current.status === "RESERVED";
    const canRetry = current.status === "ERROR" && current.operation === "cancel";
    if ((!retry && !canStart) || (retry && !canRetry)) return;

    const requestId = nextIdentity("cancel");
    const reservationForRequest =
      retry && current.status === "ERROR" && current.operation === "cancel"
        ? current.reservation
        : current.status === "RESERVED"
          ? current.reservation
          : null;
    if (reservationForRequest === null) return;

    transition(
      retry
        ? { type: "CANCEL_RETRY_STARTED", requestId }
        : { type: "CANCEL_STARTED", requestId },
    );
    setOptimisticAvailableDelta(1);

    try {
      const result = await service.cancel({
        requestId,
        reservationId: reservationForRequest.id,
        ownerId: reservationForRequest.ownerId,
      });

      if (!mountedRef.current || !isOperationActive(stateRef.current, "cancel", requestId)) {
        return;
      }

      if (result.ok) {
        transition({
          type: "CANCEL_SUCCEEDED",
          requestId,
          reservation: result.value.reservation,
        });
        setConfirmedInventory(result.value.inventory);
      } else {
        transition({ type: "CANCEL_FAILED", requestId, error: result.error });
        reconcileInventory();
      }
      setOptimisticAvailableDelta(0);
    } catch (error) {
      if (mountedRef.current && isOperationActive(stateRef.current, "cancel", requestId)) {
        transition({
          type: "CANCEL_FAILED",
          requestId,
          error: unexpectedError(error),
        });
        reconcileInventory();
        setOptimisticAvailableDelta(0);
      } else if (!mountedRef.current) {
        console.error("Cancel request failed after the page was unmounted:", error);
      }
    }
  };

  const reset = (): void => {
    const current = stateRef.current;
    if (
      current.status !== "SUCCESS" &&
      current.status !== "EXPIRED" &&
      !(current.status === "ERROR" && current.operation === "reserve")
    ) {
      return;
    }
    transition({ type: "RESET" });
    reconcileInventory();
  };

  const isPending =
    state.status === "RESERVING" ||
    state.status === "CANCELLING_RESERVE" ||
    state.status === "CHECKING_OUT" ||
    state.status === "CANCELLING";
  const reserveDisabled =
    isPending || demoRunning || remainingSaleMs <= 0 || displayedAvailable <= 0;
  const statusMessage = (() => {
    switch (state.status) {
      case "IDLE":
        return "Sẵn sàng giữ sản phẩm.";
      case "RESERVING":
        return "Đang xác nhận yêu cầu giữ hàng…";
      case "CANCELLING_RESERVE":
        return "Đang chờ kết quả để hủy yêu cầu giữ hàng; nếu đã cấp, hold sẽ được hủy.";
      case "RESERVED":
        return "Sản phẩm đã được giữ cho bạn.";
      case "CHECKING_OUT":
        return "Đang xác nhận thanh toán…";
      case "CANCELLING":
        return "Đang hủy giữ hàng…";
      case "SUCCESS":
        return `Đặt hàng thành công. Mã đơn: ${state.order.id}.`;
      case "EXPIRED":
        return "Thời gian giữ hàng đã hết.";
      case "ERROR":
        return state.error.message;
    }
  })();

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Flash Sale, về đầu trang">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>Flash Sale</span>
        </a>
        <span className="demo-badge">Bản mô phỏng</span>
      </header>

      <section className="sale-banner" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">ƯU ĐÃI CÓ THỜI HẠN</p>
          <h1 id="page-title">Chớp deal, giữ món yêu thích</h1>
          <p>Giữ sản phẩm trong 30 giây để hoàn tất đặt hàng.</p>
        </div>
        <div className="sale-clock" aria-label={`Thời gian sale còn ${formatDuration(remainingSaleMs)}`}>
          <span>SALE KẾT THÚC SAU</span>
          <strong>{remainingSaleMs > 0 ? formatDuration(remainingSaleMs) : "00:00"}</strong>
        </div>
      </section>

      <section className="product-layout" aria-label="Sản phẩm flash sale">
        <div className="product-art" aria-hidden="true">
          <div className="product-orbit orbit-one" />
          <div className="product-orbit orbit-two" />
          <div className="headphone">
            <span className="earcup earcup-left" />
            <span className="headband" />
            <span className="earcup earcup-right" />
          </div>
          <span className="art-caption">SOUND<br />WITHOUT LIMITS</span>
        </div>

        <div className="product-panel">
          <p className="eyebrow">FLASH SALE · ÂM THANH</p>
          <h2>{PRODUCT.name}</h2>
          <p className="product-description">
            Thiết kế gọn nhẹ, kết nối ổn định và âm thanh sống động cho mỗi ngày.
          </p>

          <div className="price-row">
            <strong>{formatPrice.format(PRODUCT.priceVnd)}</strong>
            <span className="discount-tag">Giá ưu đãi</span>
          </div>

          <div className="inventory-card">
            <div>
              <span className="inventory-label">CÒN LẠI</span>
              <strong className="inventory-number">{displayedAvailable}</strong>
              <span className="inventory-unit">/ {confirmedInventory.initialStock} sản phẩm</span>
            </div>
            <div
              className="stock-track"
              role="progressbar"
              aria-label="Tồn kho còn lại"
              aria-valuemin={0}
              aria-valuemax={confirmedInventory.initialStock}
              aria-valuenow={displayedAvailable}
            >
              <span
                style={{
                  width: `${(displayedAvailable / confirmedInventory.initialStock) * 100}%`,
                }}
              />
            </div>
            <p className="inventory-note">
              {optimisticAvailableDelta !== 0
                ? "Đang cập nhật số lượng…"
                : "Tồn kho được xác nhận từ dịch vụ."}
            </p>
          </div>

          <div className="reservation-area">
            {state.status === "IDLE" && (
              <button
                className="primary-button"
                type="button"
                disabled={reserveDisabled}
                onClick={() => void reserve()}
              >
                {remainingSaleMs <= 0
                  ? "Chương trình đã kết thúc"
                  : displayedAvailable <= 0
                    ? "Đã hết hàng"
                    : "Giữ sản phẩm"}
              </button>
            )}

            {state.status === "RESERVING" && (
              <div className="pending-reserve-actions">
                <button className="primary-button" type="button" disabled>
                  <span className="spinner" aria-hidden="true" />
                  Đang giữ hàng…
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={requestCancelPendingReserve}
                >
                  Hủy yêu cầu đang chờ
                </button>
              </div>
            )}

            {state.status === "CANCELLING_RESERVE" && (
              <button className="primary-button" type="button" disabled>
                <span className="spinner" aria-hidden="true" />
                Đang hủy yêu cầu giữ hàng…
              </button>
            )}

            {(state.status === "RESERVED" ||
              state.status === "CHECKING_OUT" ||
              state.status === "CANCELLING" ||
              (state.status === "ERROR" && state.operation !== "reserve")) && (
              <div className="hold-card">
                <div className="hold-heading">
                  <span className="hold-indicator" aria-hidden="true" />
                  <div>
                    <strong>Sản phẩm đang được giữ</strong>
                    <span>Mã giữ hàng: {reservation?.id}</span>
                  </div>
                </div>
                <div className="hold-time">
                  <span>THỜI GIAN GIỮ CÒN LẠI</span>
                  <strong>{formatDuration(remainingHoldMs)}</strong>
                </div>
                <div className="button-row">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={state.status !== "RESERVED" || demoRunning}
                    onClick={() => void checkout()}
                  >
                    {state.status === "CHECKING_OUT" ? "Đang thanh toán…" : "Checkout"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={state.status !== "RESERVED" || demoRunning}
                    onClick={() => void cancel()}
                  >
                    {state.status === "CANCELLING" ? "Đang hủy…" : "Hủy giữ hàng"}
                  </button>
                </div>
                {state.status === "ERROR" && (
                  <div className="retry-row">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        void (state.operation === "checkout"
                          ? checkout(true)
                          : cancel(true))
                      }
                    >
                      Thử lại {state.operation === "checkout" ? "checkout" : "hủy"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {state.status === "ERROR" && state.operation === "reserve" && (
              <div className="error-actions">
                {state.error.retryable ? (
                  <button
                    className="primary-button"
                    type="button"
                    disabled={remainingSaleMs <= 0}
                    onClick={() => void reserve(true)}
                  >
                    Thử giữ hàng lại
                  </button>
                ) : (
                  <button className="secondary-button" type="button" onClick={reset}>
                    Đóng thông báo
                  </button>
                )}
              </div>
            )}

            {(state.status === "SUCCESS" || state.status === "EXPIRED") && (
              <button className="secondary-button reset-button" type="button" onClick={reset}>
                {state.status === "SUCCESS" ? "Tiếp tục mua sắm" : "Đóng"}
              </button>
            )}

            <div
              className={`status-message${state.status === "ERROR" ? " status-error" : ""}`}
              role={state.status === "ERROR" ? "alert" : "status"}
              aria-live={state.status === "ERROR" ? "assertive" : "polite"}
            >
              {statusMessage}
            </div>
          </div>
        </div>
      </section>

      <details className="concurrency-demo">
        <summary>Kiểm thử 20 yêu cầu giữ hàng đồng thời</summary>
        <p>
          Gửi 20 request độc lập tới cùng mock service đang quản lý tồn kho.
          Demo không dùng mạng hoặc dữ liệu ngẫu nhiên; các hold thành công vẫn
          chiếm tồn trong 30 giây rồi tự hết hạn.
        </p>
        <button
          className="secondary-button"
          type="button"
          disabled={demoRunning || isPending || reservation !== null}
          onClick={() => void runConcurrencyDemo()}
        >
          {demoRunning ? "Đang chạy 20 request…" : "Chạy kiểm thử đồng thời"}
        </button>
        {demoResult !== null && (
          <div className="demo-result" role="status" aria-live="polite">
            <strong>Kết quả thực tế</strong>
            <span>
              Thành công: {demoResult.succeeded}/20 · Thất bại: {demoResult.failed}/20
            </span>
            <span>
              Tồn đầu: {demoResult.startingAvailable} · Tồn cuối: {demoResult.finalAvailable}
              {" · "}Đang giữ: {demoResult.finalReserved} · Đã bán: {demoResult.finalSold}
            </span>
            <span>Thời gian đo: {demoResult.elapsedMs} ms</span>
            {demoResult.failureCodes.length > 0 && (
              <span>Mã lỗi: {demoResult.failureCodes.join(", ")}</span>
            )}
            {demoResult.succeeded > Math.min(20, demoResult.startingAvailable) && (
              <span className="status-error">Invariant lỗi: số cấp vượt tồn đầu kỳ.</span>
            )}
          </div>
        )}
      </details>

      <footer className="page-footer">
        <span>Demo mô phỏng flash sale</span>
        <span>Giữ hàng có hiệu lực trong 30 giây</span>
      </footer>
    </main>
  );
}
