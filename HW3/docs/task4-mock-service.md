# Task 4 — Mock sale service

`createMockSaleService` creates one shared, in-memory authority for one product.
The supplied `SaleConfig` must define 10 initial units, one unit per hold, a
30-second hold, and a sale deadline. Each factory call creates an independent
service instance; competing clients must use the same instance to contend for
the same stock.

## Atomic decision and expiry policy

Each operation may await its injected delay first. After that await, it samples
the injected clock and synchronously processes due expirations, validates the
request, checks stock/ownership/deadlines, and commits the matching mutation
without another await. Reservation allocation is therefore decided in one
JavaScript event-loop turn.

At a checkout decision, `now >= expiresAt` is processed as expiry first, so
expiry wins at or after the exact deadline. Checkout wins only if it commits
while `now < expiresAt`. A completed reservation is no longer eligible for
expiry and its unit remains sold. Service operations also process deadlines
directly, so a delayed timer cannot permit an expired checkout.

## Inventory, retries, and cleanup

- Reserve keys are scoped to owner and key, and bound to the product/quantity
  payload. Replays return the same active hold; terminal holds return their
  terminal error; a changed payload conflicts.
- Checkout keys are scoped to owner and key and bound to one reservation.
  Replays and new keys for an already completed reservation return the same
  order. Checkout never creates a second order.
- Cancellation is idempotent by reservation and owner. Cancellation and expiry
  each release an active unit only when changing its status out of `active`.
- Inventory snapshots are copies and have a monotonic revision. The invariant
  after expiry processing is `available + reserved + sold === initialStock`.
- Delays, failures, clocks, and timer scheduling are injectable. Failures are
  evaluated before the operation's mutation. No random IDs or network calls are
  used; generated IDs are deterministic within a service instance. An injected
  scheduler must behave like `setTimeout` and defer its callback.
- `dispose()` is idempotent, aborts pending delays, cancels owned expiry timers,
  and prevents late uncommitted operations from mutating state. Synchronous
  snapshots after disposal throw `InvalidStateError`.

This is a single-process demo authority, not a distributed locking mechanism.
