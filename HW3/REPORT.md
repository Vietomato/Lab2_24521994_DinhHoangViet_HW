# HW3 — Implementation Report

## Architecture

The app separates domain contracts, deadline timing, a pure reservation
reducer, an in-memory mock service, and React presentation. The service is the
inventory authority within one page instance; optimistic UI stock is a
separate temporary display delta reconciled against service receipts/snapshots.

## Countdown and state machine

Sale and hold countdowns are based on absolute epoch-millisecond deadlines:
`max(0, deadline - now)`. The hook schedules one timeout at a time, recalculates
after visibility restoration, and cleans up its timeout/listener.

The reducer models `IDLE`, `RESERVING`, `CANCELLING_RESERVE`, `RESERVED`,
`CHECKING_OUT`, `CANCELLING`, `SUCCESS`, `EXPIRED`, and operation-specific
`ERROR` states. Only permitted events transition state; asynchronous responses
must match the active request ID and, where applicable, the reservation.
Side effects are handled outside the reducer.

## Inventory and concurrency

The demo has one product, 10 initial units, one unit per reservation, a
30-second hold, and a ten-minute sale deadline initialized when the app module
loads. Service operations perform their decision and mutation synchronously
after any injected delay. Due expiry is processed at the decision point;
expiry wins at `now >= expiresAt`. Repeated cancellation/expiry cannot release
the same unit twice, and repeated checkout returns the same order. A 20-request
demo exercises one shared service instance and reports actual outcomes.

## Verification

The supplied evidence records 18 passing automated tests in four files,
including clock-controlled countdown, reducer, service, and UI lifecycle
coverage. It also records successful lint/build runs and a browser concurrency
observation of 10 successful and 10 `SOLD_OUT` responses from a fresh
10-unit sale. See [`evidence/task7-test-results.md`](./evidence/task7-test-results.md)
and [`evidence/task6-concurrency-verification.md`](./evidence/task6-concurrency-verification.md).
These results are transcribed from the supplied records; this documentation
task did not rerun them.

## Limits and outstanding evidence

The mock has no backend, persistence, real identity/payment, or cross-tab/process
coordination. It does not establish production-grade distributed concurrency,
and browser timing is not server-authoritative. Existing evidence is primarily
textual; missing screenshots/raw historical diagnostics are identified, with
capture steps, in [`evidence/task8-evidence-guide.md`](./evidence/task8-evidence-guide.md).
