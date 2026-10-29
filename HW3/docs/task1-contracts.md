# Task 1 — Contract decisions

Only types, configuration, and a minimal React startup page are implemented.
There is no timer, reducer, mock service implementation, inventory mutation,
reservation, checkout, or flash-sale UI yet.

## Units and defaults

- EpochMs: Unix epoch milliseconds, matching Date.now().
- DurationMs: milliseconds; demo hold duration is 30_000 ms.
- MoneyVnd: integer Vietnamese dong, not cents; no floating currency conversion.
- Initial inventory: 10; quantity per hold: exactly 1.
- Sale duration is not specified by the assignment. Set saleEndsAt explicitly
  when creating the service in a later task; do not reset it on every render.
- Validation of numbers, IDs, and timestamps belongs to the later service.
  A type alias to number/string alone does not perform runtime validation.

## Identity and ownership

ownerId identifies a simulated client, not a real account or secure authentication.
A reservation records its owner. Cancel and checkout must match that owner.
Competing clients must share one service instance for meaningful stock contention.
Separate browser tabs do not automatically share this in-memory service.

requestId changes for EVERY attempt. The reducer/UI use it to ignore stale
responses. A service result echoes the requestId of that caller, including
when replaying an idempotent operation.

idempotencyKey identifies a logical reserve/checkout action and stays the same
when retrying that action. A distinct action uses a new key.
Scope keys by operation + owner. Reusing a scoped key with different payload
is IDEMPOTENCY_CONFLICT; do not allocate inventory or create another order.

For reserve, simultaneous duplicate keys share the logical outcome and reservation ID.
After a hold is cancelled/expired/completed, the same key must not create a new
hold: return the corresponding terminal error rather than a stale active receipt.
A failure injected before commitment may be retried with the same key.

For checkout, duplicates for the same completed reservation return the same order
for its owner. They never create another order, including with a different key.
A key already bound to another reservation is an idempotency conflict.
Cancel is naturally idempotent by reservationId and ownerId, with no extra key.

## Deadlines and atomic decisions (behavior for Tasks 2–4)

saleEndsAt controls NEW reservations: now >= saleEndsAt rejects them.
expiresAt controls an existing hold: now >= expiresAt means expired.
The service sets expiresAt = grantedAt + holdDurationMs at the grant decision.
A valid hold may check out after the sale ends, until its own expiresAt.

Latency and injected failures happen before commitment. Validation and the matching
mutation form one synchronous section, with no await between them.
All operations re-evaluate due expirations before relevant inventory decisions.
If checkout commits first, later expiry never releases sold inventory. If expiry
has already occurred at checkout decision time, checkout fails without an order.

Snapshots are isolated copies. Inventory revision is monotonic within one service,
so a delayed older receipt must not overwrite a newer displayed stock snapshot.
UI temporary stock adjustments remain separate from service-confirmed stock.
Invariant after expiry processing:

    available + reserved + sold = initialStock

This is a single-process simulation, not proof of distributed concurrency safety.

## Errors and disposal

ServiceResult uses ok as a discriminant. Expected domain failures are error values;
UI callers must also handle unexpected Promise rejection.
retryable indicates a potentially retryable failure, not a guarantee that a hold
is still valid. The service must revalidate on each attempt.

A success receipt includes the inventory snapshot from that atomic operation.
After failure, UI can read getSnapshot() to reconcile authoritative inventory.
Error states for checkout/cancel retain the hold record only as context; that
record is not proof the hold is still valid at the next service decision.

The service owns any timers it creates. dispose() is idempotent, aborts waiting
work, invalidates pending callbacks and does not roll back committed orders.
Uncommitted pending operations must settle with SERVICE_DISPOSED. New asynchronous
operations after dispose return SERVICE_DISPOSED; synchronous snapshot/expiry
operations after dispose throw InvalidStateError. Implement this policy in Task 4.
getSnapshot/processExpirations process due expiry while the service is live.

A stale UI response is ignored by requestId. If it granted a hold, its stock must
still be reclaimed by explicit cancellation or documented 30-second expiry.
Transport abortion alone is not cancellation of a committed reservation.

## UI state shape

Reservation is a service-domain record. ReservationState is the client view of an
operation. Its status discriminant determines which fields exist.

| State | Relevant data |
| --- | --- |
| IDLE | No pending request or confirmed hold |
| RESERVING | requestId and reserve idempotencyKey; no confirmed reservation |
| RESERVED | Confirmed active reservation, including id and expiresAt |
| CHECKING_OUT | Hold, requestId, checkout idempotencyKey |
| CANCELLING | Hold and cancellation requestId |
| SUCCESS | Confirmed order |
| EXPIRED | Reservation identity/deadline details |
| ERROR | Error, failed operation, requestId, retry context appropriate to that operation |

CANCELLING is an explicit implementation choice to model asynchronous cancellation.
A cancelled hold remains in service history with status cancelled. The UI may
return to IDLE with separate status feedback; no permanent CANCELLED UI state is
required. ERROR is further discriminated by operation: checkout/cancel failures
carry a hold; reserve failures do not invent one.

Task 3 will implement event types and transitions. Intended examples:
- IDLE -> RESERVING -> RESERVED -> CHECKING_OUT -> SUCCESS.
- RESERVED -> CANCELLING -> IDLE on confirmed cancellation.
- RESERVED -> EXPIRED when the hold expires.
- A retryable reserve error retries the same logical action with a new requestId.
- A checkout failure may retry checkout while the service confirms the hold is valid.
- Stale or invalid events do not overwrite current state.

No event dispatch, reducer, timer or asynchronous logic is implemented in Task 1.
