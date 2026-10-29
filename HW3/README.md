# HW3 — Flash Sale Demo

A React, TypeScript, and Vite simulation of a single-product flash sale. The
page demonstrates deadline countdowns, temporary reservations, checkout,
cancellation, expiry, and competing reservation requests. It is an in-memory
demo, not a payment system or production inventory service.

## Run locally

From this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The demo uses one product, 10 initial units,
one unit per reservation, a 30-second hold, and a sale deadline set to ten
minutes after the app module loads. Reloading starts a fresh in-memory sale.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Run the TypeScript project build checks |
| `npm run lint` | Run ESLint with warnings treated as errors |
| `npm test` | Run the Vitest suite once |
| `npm run build` | Type-check and create the production bundle in `dist/` |
| `npm run preview` | Preview the built `dist/` bundle |

These are the scripts declared in [`package.json`](./package.json).

## Architecture

- `src/contracts/flash-sale.ts` defines product, reservation, order, inventory,
  request, service-result, and UI-state types.
- `src/timer/` calculates remaining time from an absolute epoch-millisecond
  deadline. The hook schedules at most one timeout at a time and refreshes when
  the page becomes visible.
- `src/state/reservation-reducer.ts` is the pure UI state machine. Service calls,
  timers, and inventory mutations remain outside the reducer.
- `src/service/mock-sale-service.ts` owns the in-memory inventory and
  reservation/order records. Its clock, delay, failure hook, and scheduler can be
  injected for deterministic tests.
- `src/App.tsx` connects the service, reducer, countdowns, optimistic stock
  display, purchase controls, and a separate 20-request concurrency demo.
- `tests/` covers countdowns, reducer transitions, service invariants, and UI
  lifecycle behavior.

## Inventory and concurrency behavior

The service grants at most one unit per reservation. A hold expires 30 seconds
after its service grant time. At each operation decision, due expirations are
processed before stock checks; expiry wins at `now >= expiresAt`, while checkout
can win only before that deadline. Cancellation and expiry release a held unit
only once, and checkout retries return the same order. After expiry processing:

```text
available + reserved + sold = initialStock
```

The 20-request panel submits requests to the same service instance used by the
page. On a fresh sale with 10 available units, the expected result is 10
successful holds and 10 `SOLD_OUT` results. This is an expected result, not a
claim about every run: prior holds and orders affect starting availability.
Successful demo holds consume stock until they expire.

## Verification and limitations

The recorded automated run passed 18 tests in four files; recorded lint and
build runs also passed. Browser observations and test details are in
[`evidence/`](./evidence/). These are supplied records, not a claim that the
commands were rerun while writing these documents.

The mock service is shared only within one running page's JavaScript instance.
Separate tabs and processes do not coordinate inventory; there is no server,
database, authentication, payment processing, persistence, or distributed
locking. The client clock and displayed countdown are not authoritative server
time.

See [`REPORT.md`](./REPORT.md) for a concise implementation report,
[`AI_FAILURE_AUDIT.md`](./AI_FAILURE_AUDIT.md) for observed AI errors and
corrections, and [`evidence/task8-evidence-guide.md`](./evidence/task8-evidence-guide.md)
for missing evidence and capture instructions.
