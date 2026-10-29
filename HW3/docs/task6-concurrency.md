# Task 6 — Concurrency review

## Concurrency behavior

- UI handlers check the reducer state synchronously through a ref, so duplicate
  clicks cannot start a second logical purchase action merely by beating React's
  next render.
- A pending reserve can be abandoned. The UI remains in a cancelling state until
  its result arrives. If the service granted a hold, the UI calls cancel before
  enabling another purchase; if reserve failed, it returns to idle. A failed
  cleanup is exposed as a cancel error with the hold retained for retry.
- Responses are matched by request ID. Late successful reserve responses after
  unmount are cancelled; late checkout results are not used to mutate disposed
  UI. A checkout already committed by the service remains sold.
- Checkout and expiry have one service decision point after the injected delay.
  Expiry is processed first at `now >= expiresAt`, so expiry wins at and after
  the boundary. Checkout wins if it commits at `now < expiresAt`. The service
  rechecks the deadline even if its expiry timer callback was delayed.
- Cancellation and expiry release stock only when they transition an active
  reservation. The service state is authoritative; UI optimistic values cannot
  alter service stock.

## Repeatable 20-request demo

Open **Kiểm thử 20 yêu cầu giữ hàng đồng thời** separately from the normal
purchase controls. Click **Chạy kiểm thử đồng thời** to submit 20 unique reserve
requests with `Promise.all` to the same module-scoped service instance used by
the product UI. Each request uses a distinct owner and idempotency key.

Run it before making a normal reservation for the clearest initial result. With
10 available units and the default zero-delay mock, expected observed result is
10 successful holds and 10 `SOLD_OUT` results. The panel reports actual
success/failure counts, starting and ending available stock, reserved/sold
quantities, elapsed time, and returned failure codes. Successful demo holds
temporarily reduce availability and expire after 30 seconds; they are not
silently cancelled or reset by the demo.

If existing holds or completed orders have consumed stock, success count is
bounded by the service's actual starting availability, not assumed to be 10.
The control is disabled during another UI operation or while the shopper has an
active hold. It does not reset or replace the service.

## Evidence and simulation limits

The observed UI run and controlled concurrency checks are recorded in
[`../evidence/task6-concurrency-verification.md`](../evidence/task6-concurrency-verification.md).
No screenshot is required for this task. The service is shared only inside this
page's JavaScript application instance; separate tabs/processes do not share
inventory and this mock is not production multi-client locking.
