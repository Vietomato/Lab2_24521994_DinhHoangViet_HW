# Task 7 — Automated test evidence

Run on 2026-10-29 from `HW3`:

- `npm test` — passed: 4 test files, 18 tests.
- `npm run lint` — passed with `--max-warnings 0`.
- `npm run build` — passed, including `tsc -b` type-checking source and tests.

Test distribution:

- Countdown: 4 tests for an injected clock, delayed callback, zero clamp,
  deadline change, visibility refresh, and timeout cleanup.
- Reducer: 2 tests for valid transitions, invalid transitions, retries,
  cancellation, expiry, and stale request responses.
- Mock service: 10 tests for duplicate and concurrent reserve, stock bounds,
  cancel/expiry single release, checkout idempotency, both sides of the expiry
  boundary, failure injection, and disposal.
- App lifecycle: 2 jsdom tests for optimistic stock and rollback, plus late
  reservation cleanup after StrictMode unmount.

Tests use injected clocks, controlled promises, and injected schedulers. They do
not wait for the real 30-second hold and do not use random values or network
requests.

The initial test run had one incorrect assertion that expected a repeated
checkout's entire response to equal the first response. The service correctly
retained the new attempt's `requestId` while returning the same order. The test
was corrected to assert order identity; no application implementation was
changed for this test assertion.

No screenshots are required or included. Task 6's browser observations are
recorded separately in `task6-concurrency-verification.md`.
