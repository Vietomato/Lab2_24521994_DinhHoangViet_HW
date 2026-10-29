# Task 6 — Concurrency verification record

Observed in the local browser at `http://127.0.0.1:5187/` on 2026-10-29:

- The 20-request demo began with 10 available units.
- 10 requests succeeded and 10 failed with `SOLD_OUT`.
- At completion: 0 available, 10 reserved, 0 sold; reported duration was 7 ms.
- A browser double-click on **Giữ sản phẩm** created one reservation and
  displayed 9 available units.
- At a 375px viewport, `document.documentElement.scrollWidth` equaled
  `clientWidth` (360 CSS px); no horizontal document overflow was detected.

Controlled local assertions passed for:

- Cancelling a pending reserve, waiting for its result, cancelling the granted
  hold, and restoring inventory once.
- A stale reserve response not changing the reducer's cancellation state.
- Checkout at `expiresAt - 1` succeeding; subsequent expiry not releasing the
  sold unit.
- Twenty concurrent reservations granting no more than the 10 available units.

Commands observed passing: `npm run typecheck`, `npm run lint`, and
`npm run build`.

No screenshot is required or included. These observations describe this one
browser application instance and do not establish cross-tab or production
distributed concurrency.
