# Task 8 — Evidence status and capture guide

## Evidence already present

- [`task6-concurrency-verification.md`](./task6-concurrency-verification.md):
  recorded browser concurrency result, double-click observation, viewport
  measurement, and controlled assertions.
- [`task7-test-results.md`](./task7-test-results.md): recorded test count,
  test coverage, lint/build outcomes, and the corrected test-only assertion.
- [`../prompt_log_copilot_ide.md`](../prompt_log_copilot_ide.md): transcribed
  prompts and work records, including observed failures and corrections.
- Before Task 8, Git history contained 10 meaningful HW3 commits; the requested
  documentation commit is another meaningful commit. No empty commit is needed
  to meet the eight-commit requirement.

These are textual records. No screenshots or raw historical compiler/linter
logs were supplied, and this guide does not claim that such files exist.

## Screenshots and terminal captures still useful

Capture only genuine current results; do not recreate an old failure screenshot
or label a new run as the historical one.

1. **Reservation and countdown:** In a fresh app load, capture the product page
   after clicking **Giữ sản phẩm**. Keep the reservation ID, remaining hold
   countdown, and displayed stock visible.
2. **Cancellation:** Click **Hủy giữ hàng** and capture the resulting status and
   restored stock. A fresh load starts a new in-memory service if needed.
3. **Checkout:** On a fresh load, reserve again and click **Checkout**. Capture
   the success status/order ID. A separate repeated-checkout automated test is
   already recorded; do not imply the UI offers a duplicate-checkout control.
4. **Concurrency:** Start from a fresh page with 10 available units, expand
   **Kiểm thử 20 yêu cầu giữ hàng đồng thời**, then click
   **Chạy kiểm thử đồng thời**. Capture the finished panel showing starting and
   final inventory, success/failure counts, and failure codes. Successful holds
   consume stock until expiry, so run this before creating another hold.
5. **Current quality checks:** From `HW3`, run `npm test`, `npm run lint`, and
   `npm run build`; capture each terminal result with the command and exit
   status visible. Keep these labeled as a new run with its date, not as the
   historical output.
6. **Git history:** Run `git --no-pager log --oneline -10` from the repository
   and capture the meaningful task commits. Do not add a commit merely to pad
   the count.
7. **Historical AI errors:** If the original session/compiler/linter/test output
   is still accessible, capture the original prompt and failure together, plus
   the corresponding correction/retest. The current prompt log records these
   outcomes, but not the raw diagnostics. If unavailable, leave that limitation
   explicit; do not fabricate output.

Save genuine captures in this directory with descriptive names (for example
`reservation-state.png`, `checkout-success.png`, or
`test-run-2026-10-29.png`) and add a short caption stating what is visible and
whether it is a browser observation, automated test, or terminal run. Avoid
capturing unrelated personal data or credentials.
