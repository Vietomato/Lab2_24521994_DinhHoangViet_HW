# Project Rules — HW3: Flash-Sale E-Commerce Engine

## 1. Scope and Authority

- Build the HW3 demo with React, TypeScript, and Vite.
- Use one product, initial inventory 10, quantity 1 per reservation, and a 30-second hold as demo defaults.
- Implement a sale countdown, reservation lifecycle, simulated checkout, cancellation, expiry, and competing-request verification.
- Do not add authentication, carts, real payments, or a production backend unless requested.
- The mock service is authoritative within this simulation; React state is not the inventory authority.
- Clearly distinguish assignment requirements from implementation choices.

## 2. AI and Development Workflow

- Follow TASK_DECOMPOSITION.md.
- One prompt addresses one listed task or a smaller focused unit.
- Define contracts before generating implementation code.
- Implement one focused module/configuration unit at a time; split prompts further if a task spans unrelated work.
- Inspect supplied files before proposing changes; never claim access to files not provided.
- The student creates files and runs commands locally unless another workflow is explicitly authorized.
- Do not claim that tests, commands, or browser checks were executed without actual results.
- Preserve completed work and stop after the requested task.
- Verify, update the checklist, and commit completed work.

## 3. Code and Project Structure

- Enable strict TypeScript; do not use explicit any.
- Separate domain contracts, pure reducer logic, timer logic, service operations, and React presentation.
- Use const/let, not var.
- Do not use raw innerHTML or dangerouslySetInnerHTML.
- Do not use inline HTML event attributes; React event props are allowed.
- Use keydown and event.key when custom keyboard handling is required.
- Use stable IDs for entities and React keys, not render-time random keys or array positions.
- Keep external dependencies minimal and verify their peer compatibility.
- Keep secrets, node_modules, and dist out of Git.
- Track package.json and package-lock.json.

## 4. Contracts and State

- Define Product, Reservation, Order, request identity, domain errors, and service operations explicitly.
- Represent timestamps as epoch milliseconds and document money units.
- Use a discriminated union for reservation UI state.
- Distinguish a pending request from a confirmed reservation.
- Store requestId, reservationId, and expiresAt only in relevant states.
- Define cancellation, retry, checkout failure, expiry, and success transitions.
- Reject or safely ignore invalid events; do not silently enter impossible states.
- Keep reducers pure: no requests, timer creation, or inventory mutation inside them.
- Request IDs must prevent an old response from overwriting a newer operation.

## 5. Deadline Timing

- Calculate remaining time with Math.max(0, deadline - now).
- Do not repeatedly subtract a fixed interval from previous remaining time.
- Keep saleEndsAt separate from reservation expiresAt.
- Use Date.now() by default and allow an injected clock for tests.
- Recalculate on visibility restoration and deadline changes.
- Cancel timers/animation frames and listeners during cleanup.
- Prevent duplicate scheduling loops.
- Match React update frequency to the displayed precision.
- Explain that callback-drift correction does not guarantee server-clock accuracy.

## 6. Inventory Invariants

- Available stock must never be negative.
- With no replenishment, available + active reserved + sold quantities must equal the initial inventory after expiry processing.
- Grant a reservation only if stock and sale conditions allow it.
- The reservation deadline starts when the service grants the hold.
- Release each reservation's stock at most once on cancellation or expiry.
- Never release inventory belonging to a completed order.
- Checkout must not consume stock twice or create duplicate orders.
- Duplicate reservation requests using the same idempotency key must not allocate another unit.
- Define idempotency-key behavior for retries and distinct new operations.
- The UI must not independently mutate authoritative stock.

## 7. Concurrency and Expiry Policy

- Use one shared mock service instance for competing requests in a demo scenario.
- Place simulated latency outside synchronous validation/mutation sections.
- Do not await between checking stock and allocating it.
- Define the operation's decision point explicitly.
- Reject new reservations when now >= saleEndsAt.
- A previously confirmed hold may check out after the sale deadline if its own reservation remains valid.
- Treat now >= expiresAt as expired.
- Recheck reservation validity at the atomic checkout decision, not only when rendering a countdown.
- If checkout commits before expiry, later expiry must not release the sold unit.
- If the reservation has expired before checkout commits, checkout must fail without creating an order.
- Expiry callbacks may be delayed: service operations must still validate timestamps directly.
- Do not claim that a single-process mock proves production multi-client concurrency.

## 8. Optimistic UI and Failure Recovery

- Keep optimistic display values separate from service-confirmed inventory.
- Reconcile after success and roll back temporary changes after failure.
- Do not double-subtract or double-release during reconciliation.
- Disable duplicate UI actions where appropriate, but enforce invariants in the service as well.
- Show useful pending, success, expiry, cancellation, and error feedback.
- Distinguish failed operations from successful operations whose UI response arrived late.
- Ignore stale UI responses without leaking newly granted reservations: cancel/release them or let the documented expiry policy reclaim them.
- Do not hide expected failures in empty catch blocks.

## 9. Lifecycle and Accessibility

- Define ownership for service instances, timers, subscriptions, and request callbacks.
- Cleanup must be safe to call repeatedly.
- Do not update disposed UI or services from late callbacks.
- React StrictMode setup/cleanup cycles must not create duplicate holds, listeners, or timers.
- Use semantic buttons, labels, visible focus, and keyboard-operable controls.
- Announce meaningful state changes where useful; do not announce every countdown frame.
- Do not rely on color alone to communicate state.
- Keep test/demo controls separate from normal purchase controls.

## 10. Testing and Evidence

- Check real behavior before marking a task complete.
- Run typecheck and lint after relevant code changes.
- Run build after configuration/integration changes and for final verification.
- Use the automated verification task to cover business invariants, boundary times, duplicate requests, stale responses, and cleanup.
- Use controlled clocks, delays, failures, and promises; avoid random or slow tests.
- For the 20-request/10-unit scenario, hold time must not expire and no inventory may be released during the measurement.
- Test actual overlapping service calls, not only disabled-button behavior.
- Manually check browser integration in addition to mocked tests.
- Record actual outcomes under evidence/ and separate them from expected outcomes.
- Never fabricate screenshots, failures, test passes, or timing claims.

## 11. Git and Submission

- Retain at least eight meaningful Conventional Commits as required by HW3.
- Prefer one focused commit per completed WBS task; add correction commits when needed.
- Review staged changes and include only relevant files.
- Do not introduce bugs or create empty commits to meet the count.
- Preserve individual commits when merging if the submitted history must show the required milestones.
- Maintain README.md, TASK_DECOMPOSITION.md, REPORT.md, and AI_FAILURE_AUDIT.md.
- Audit at least three genuinely observed AI flaws with prompt/output, impact, evidence, correction, and verification.
- If fewer than three flaws are documented, report the shortfall instead of inventing entries.
