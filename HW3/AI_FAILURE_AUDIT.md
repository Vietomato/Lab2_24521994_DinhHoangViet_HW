# AI Failure Audit — HW3

This audit uses only failures explicitly recorded in the supplied
[`prompt_log_copilot_ide.md`](./prompt_log_copilot_ide.md) and
[`evidence/task7-test-results.md`](./evidence/task7-test-results.md). The
original raw compiler/linter output and screenshots were not supplied, so none
are reconstructed here. Prompt references below point to the corresponding
user task captured in the prompt log.

## 1. Task 4 — TypeScript errors in service implementation

- **Prompt:** Task 4 requested the shared mock inventory service, reservation
  replay/idempotency, and expiry timers: “mock service có shared state cho sản
  phẩm tồn 10” and “Có dispose nếu service sở hữu timer.” See “User — Task 4”
  in the prompt log.
- **Error:** The first typecheck found two TypeScript narrowing/inference issues
  in reserve replay and timer cancellation.
- **Risk:** The service could not be typechecked/built reliably until these
  implementation errors were corrected.
- **Evidence:** The Task 4 work record in the prompt log explicitly records both
  issues and says they were corrected before final validation. The final record
  states that typecheck, lint, and build passed.
- **Correction:** Corrected the reserve-replay typing and timer-cancellation
  typing in the implementation. The log does not preserve the exact diagnostics
  or a before/after diff, so the precise compiler messages remain unavailable.
- **Retest:** The recorded final Task 4 verification reports `npm run typecheck`,
  `npm run lint`, and `npm run build` passing.
- **Evidence gap:** Capture the original compiler output from conversation/tool
  history if it remains available; do not recreate it from memory.

## 2. Task 4 — Invalid fake-clock test setup

- **Prompt:** The same Task 4 prompt requested deterministic clock-controlled
  expiry and checkout behavior: “Cho phép truyền clock, delay và cơ chế gây lỗi
  để test xác định.” See “User — Task 4” in the prompt log.
- **Error:** An early expiry test used one fixed clock and then attempted to
  move time backwards for another scenario; the recorded work log identifies
  that test setup as invalid.
- **Risk:** A non-monotonic test clock can invalidate conclusions about deadline
  ordering and produce misleading race/expiry test results.
- **Evidence:** The Task 4 work record says the scenarios were rerun with
  separate injected clocks. Its final verification lists exact-deadline expiry
  and checkout just before expiry among the controlled assertions.
- **Correction:** Isolated the scenarios with separate injected clocks rather
  than reversing time within one scenario.
- **Retest:** The recorded controlled assertions passed; the later
  [`task7-test-results.md`](./evidence/task7-test-results.md) reports automated
  coverage of both sides of the expiry boundary.
- **Evidence gap:** The original failing assertion/output is not preserved; only
  the failure and correction are documented in the prompt log.

## 3. Task 5 — Lint failure in expiry effect

- **Prompt:** Task 5 requested UI integration, expiry handling, and safe
  lifecycle cleanup: “Cleanup đúng khi unmount và hoạt động với React
  StrictMode.” See “User — Task 5” in the prompt log.
- **Error:** The first lint pass identified synchronous state updates in the
  expiry effect.
- **Risk:** The implementation failed the configured lint checks and the effect
  did not meet the intended lifecycle pattern.
- **Evidence:** The Task 5 work record explicitly records the lint failure and
  that the implementation changed in response.
- **Correction:** Moved expiry handling to a cleanup-managed timeout.
- **Retest:** The Task 5 result records `npm run typecheck`, `npm run lint`, and
  `npm run build` passing.
- **Evidence gap:** The actual lint diagnostic and its source line were not
  retained in the supplied records.

## 4. Task 7 — Incorrect idempotent-checkout test assertion

- **Prompt:** Task 7 asked for tests of repeated checkout without duplicate
  orders and explicitly said not to silently change implementation to make tests
  pass: “Checkout lặp không tạo thêm đơn” and “Không âm thầm sửa implementation
  để tests pass.” See “User — Task 7” in the prompt log.
- **Error:** The first test run expected a repeated checkout's entire response
  to equal the first response. Each attempt correctly has its own `requestId`,
  even though both responses contain the same order.
- **Risk:** The assertion would reject correct request-correlation behavior and
  could prompt an unnecessary, incorrect change to the service contract.
- **Evidence:** Both the Task 7 work record and
  [`task7-test-results.md`](./evidence/task7-test-results.md) record the
  incorrect assertion and the retained request identity behavior.
- **Correction:** Changed the test to compare order identity, not the whole
  response. No application implementation was changed for this test issue.
- **Retest:** The recorded final run passed 18 tests across four files, plus
  lint and build.
- **Evidence gap:** The initial failing test output is not included; the
  corrected test outcome and explanation are documented.
