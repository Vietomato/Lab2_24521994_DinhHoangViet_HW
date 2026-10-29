# Task 3 — Reservation lifecycle reducer

`reservationReducer` is pure: it only maps a current state and typed event to a
new state. Service calls, timers, clock reads, and inventory changes stay outside
the reducer. Invalid events return the original state unchanged.

## Allowed transitions

| Current state | Event | Next state |
| --- | --- | --- |
| IDLE | RESERVE_STARTED | RESERVING |
| RESERVING | matching RESERVE_SUCCEEDED | RESERVED |
| RESERVING | matching RESERVE_FAILED | ERROR (reserve) |
| ERROR (reserve) | RESERVE_RETRY_STARTED | RESERVING, retaining idempotency key |
| RESERVED | CHECKOUT_STARTED | CHECKING_OUT |
| CHECKING_OUT | matching CHECKOUT_SUCCEEDED for same reservation | SUCCESS |
| CHECKING_OUT | matching CHECKOUT_FAILED | ERROR (checkout) |
| ERROR (checkout) | CHECKOUT_RETRY_STARTED | CHECKING_OUT, retaining hold and key |
| RESERVED | CANCEL_STARTED | CANCELLING |
| CANCELLING | matching CANCEL_SUCCEEDED (cancelled) | IDLE |
| CANCELLING | matching CANCEL_SUCCEEDED (expired) | EXPIRED |
| CANCELLING | matching CANCEL_FAILED | ERROR (cancel) |
| ERROR (cancel) | CANCEL_RETRY_STARTED | CANCELLING |
| RESERVED or retryable hold ERROR | matching RESERVATION_EXPIRED | EXPIRED |
| ERROR (reserve), EXPIRED, or SUCCESS | RESET | IDLE |

Any transition not listed above is ignored. Every async response must match the
active requestId. Cancellation responses must also match the held reservation;
checkout success must match its reservation. An expiry event must match both
reservationId and expiresAt, so a delayed timer for an earlier hold cannot expire
a newer one.

Checkout and cancellation keep their operation pending on client-side timer
notifications. The service response remains authoritative for those in-flight
operations; a `RESERVATION_EXPIRED` failure transitions them to EXPIRED.
An expired hold cannot be retried as checkout or cancellation. A new reservation
requires returning to IDLE first.

`RESERVE_RETRY_STARTED` and `CHECKOUT_RETRY_STARTED` take a fresh requestId but
reuse the operation's idempotency key. Cancellation retries use a fresh requestId
and the same retained reservation. RESET is not allowed while a request or active
hold exists.
