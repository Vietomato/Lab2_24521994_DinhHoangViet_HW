TASK_DECOMPOSITION — HW3: Flash-Sale E-Commerce Engine
1. Scope
Build a React + TypeScript + Vite simulation with one product, 10 initial units, one unit per reservation, a 30-second reservation period, a sale deadline, simulated checkout, cancellation, expiry, and competing requests.

These quantities are demo choices. Authentication, a database, a real payment provider, and a production backend are outside scope.
2. Workflow
- One AI prompt addresses one task below or a smaller focused subtask.
- Define contracts before implementing their behavior.
- Generate → independently verify → update this checklist → commit.
- Each task is a focused delivery unit, not a request to generate the entire application.
- Keep at least eight meaningful Conventional Commits, as required by HW3.
- A task may contain related functions; split generation further when needed to maintain a focused module boundary.
- Do not create empty commits or introduce defects to meet submission requirements.
3. Definition of Done
- [X] Countdown derives remaining time from an absolute deadline and never displays negative time.
- [X] Sale expiry and reservation expiry are handled separately.
- [X] Reservation states and permitted transitions are explicit.
- [X] Optimistic UI updates reconcile or roll back correctly.
- [X] Inventory never becomes negative or exceeds initial stock through duplicate releases.
- [X] Cancelled or expired reservations release inventory at most once.
- [X] Repeated checkout does not create duplicate orders or consume stock twice.
- [X] Competing requests and late responses have consistent outcomes.
- [X] Timers and asynchronous callbacks are cleaned up or invalidated.
- [X] Relevant tests, typecheck, lint, and build pass (per recorded Task 7 results).
- [X] Evidence records actual observations and simulation limitations; missing raw outputs/screenshots are disclosed.
- [X] AI_FAILURE_AUDIT.md contains at least three observed AI flaws with corrections and evidence.
- [X] At least eight meaningful Conventional Commits are retained (10 HW3 commits before Task 8).
Task 1 — Foundation and Contracts
- [X] Inspect existing files before scaffolding; preserve completed work.
- [X] Configure React, TypeScript strict mode, Vite, and linting.
- [X] Provide dev, typecheck, lint, build, and preview scripts.
- [X] Create a minimal startup page.
- [X] Define Product, Reservation, Order, request identity, reservation state, and mock service contracts.
- [X] Define money units, timestamp units, reservation ownership, and service errors explicitly.
- [X] Distinguish saleEndsAt from reservation expiresAt.
- [X] Record rules and this task plan.
Verify: typecheck, lint, and build pass; the startup page opens.

Commit: chore(hw3): initialize project and contracts
Task 2 — Deadline Countdown
- [X] Implement a pure remaining-time calculation and its scheduling adapter/hook.
- [X] Calculate Math.max(0, endTime - now) on every update.
- [X] Do not subtract a fixed amount from previous state on each callback.
- [X] Handle expired deadlines, changed deadlines, delayed callbacks, and disposal.
- [X] Recalculate when the page becomes visible again.
- [X] Avoid unnecessary per-frame React state updates.
- [X] Allow clock injection for later deterministic tests.
Verify: a delayed callback catches up to the deadline; the countdown reaches zero without negative output; cleanup prevents additional updates.

Commit: feat(timer): implement deadline countdown
Task 3 — Reservation State Machine
- [X] Implement a pure reducer using the established discriminated union.
- [X] Cover IDLE, RESERVING, RESERVED, CHECKING_OUT, SUCCESS, EXPIRED, and ERROR, with explicit cancellation behavior.
- [X] Specify permitted events and transitions, including retry and checkout failure.
- [X] Carry requestId, reservationId, and expiresAt where appropriate.
- [X] Ignore stale responses that do not belong to the current operation.
- [X] Keep service calls, timers, and other side effects outside the reducer.
Verify: normal reservation/checkout flow, failure recovery, cancellation, expiry, and stale-event rejection using example event sequences.

Commit: feat(state): implement reservation lifecycle
Task 4 — Mock Inventory Service
- [X] Implement reserve, cancel, expiry handling, checkout, and inventory snapshots against shared in-memory state.
- [X] Put simulated delays outside the synchronous stock validation/update section.
- [X] Never await between stock validation and its corresponding mutation.
- [X] Reject new reservations after the sale deadline.
- [X] Let confirmed reservations remain valid until their own expiry even if the sale ends.
- [X] Set expiresAt when the service grants a reservation, not when the client receives the response.
- [X] Treat now >= expiresAt as expired.
- [X] Make release operations idempotent and define request/checkout idempotency keys.
- [X] At the atomic checkout decision, a completed order remains completed; an already expired reservation cannot check out.
- [X] Ensure expiry processing and checkout cannot both consume/release the same held unit.
- [X] Inject clock, delay, and failure behavior for reproducible verification.
- [X] Define disposal for service-owned timers.
Verify: normal reserve/cancel/checkout; duplicate requests; sold-out behavior; expiry boundary; inventory conservation.

Commit: feat(service): implement inventory simulation
Task 5 — Accessible UI Integration
- [X] Connect the existing countdown, reducer, and service.
- [X] Display product, available stock, sale countdown, reservation countdown, and operation status.
- [X] Provide reserve, checkout, cancel, and appropriate retry controls.
- [X] Implement optimistic display updates with explicit reconciliation and rollback.
- [X] Keep optimistic display values separate from authoritative service inventory.
- [X] Avoid duplicate stock deductions or releases during reconciliation.
- [X] Provide semantic buttons, labels, visible focus, and useful status/error text.
- [X] Disable invalid actions without relying on disabled buttons for service correctness.
- [X] Keep lifecycle setup/cleanup compatible with React StrictMode.
Verify: the complete flow works with mouse and keyboard; pending/error states are visible; failed requests roll back correctly.

Commit: feat(ui): integrate flash sale flow
Task 6 — Concurrency and Lifecycle Review
- [X] Review duplicate clicks, overlapping requests, stale responses, and checkout/expiry races.
- [X] Handle cancellation or unmount while a reservation request is pending.
- [X] Prevent late UI updates; also release or expire orphaned confirmed reservations according to the service policy.
- [X] Add a repeatable demonstration of 20 overlapping reservation requests against one service initialized with 10 units.
- [X] Show actual success/failure counts and final inventory.
- [X] Keep the demo separate from normal user checkout flow.
- [X] Review and complete concurrency behavior without deliberately introducing defects.
Verify: at most 10 reservations succeed while none expire or are released during the scenario; inventory is non-negative; stale operations cannot replace newer state; cleanup is safe.

Suggested commit: fix(concurrency): handle duplicate and stale requests
Use feat or refactor instead if that accurately describes the actual changes.
Task 7 — Automated Verification
- [X] Add the minimum necessary test runner/configuration.
- [X] Test deadline calculations, delayed callbacks, zero, deadline changes, and cleanup.
- [X] Test valid/invalid state transitions and stale request events.
- [X] Test overlapping reservations and stock conservation.
- [X] Test duplicate cancel, expiry, reserve, and checkout requests.
- [X] Test exact expiry boundaries and checkout competing with expiry.
- [X] Test failure recovery, optimistic rollback, and late results after unmount.
- [X] Use fake/injected clocks and controlled promises; avoid real 30-second waits, uncontrolled randomness, and network dependencies.
- [X] Report the initial test assertion correction; no implementation defect was found.
Verify: automated tests, typecheck, lint, and build pass; Task 6's browser run separately verified the user flow.

Commit: test(hw3): verify sale invariants
Task 8 — Evidence and Documentation
- [X] Update README.md to match the final source, scripts, and limitations.
- [X] Write a short REPORT.md explaining architecture, deadline timing, state transitions, inventory behavior, and verification.
- [X] Retain the supplied textual evidence under evidence/ and document missing screenshots/raw diagnostics with capture instructions; do not claim they exist.
- [X] Document at least three actually observed AI flaws in AI_FAILURE_AUDIT.md.
- [X] Include prompt, recorded failure, risk, evidence, correction, and verification outcome for each audit entry; identify unavailable raw output.
- [X] Separate expected outcomes from observed outcomes.
- [X] Check all Definition of Done items and at least eight meaningful commits; 10 meaningful HW3 commits were present before this documentation commit.
Verify: every completion claim is supported by source inspection or recorded execution; unresolved issues remain visible.

Commit: docs(hw3): add evidence and AI failure audit
4. Evidence Plan
Evidence	What to record under evidence/
Reservation	Observed UI state with reservation ID, stock, and remaining hold time
Expiry/cancellation	Test result showing stock is released only once
Checkout	Result showing an idempotent retry returns the same order
Concurrency	Controlled test/demo output: requests, successes, failures, and final inventory
Countdown	Clock-controlled test showing correction after a delayed callback
Quality checks	Actual test, typecheck, lint, and build results
AI audit	Observed faulty output, failure evidence, correction, and retest
Git	git log --oneline showing meaningful task commits


Evidence records and controlled tests substantiate timing and atomicity claims; document the single-process simulation boundary.