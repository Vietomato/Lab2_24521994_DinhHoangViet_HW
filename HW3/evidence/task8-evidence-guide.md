# Task 8 — Evidence status and capture guide

## Evidence already present

- [`task6-concurrency-verification.md`](./task6-concurrency-verification.md):
  recorded browser concurrency result, double-click observation, viewport
  measurement, and controlled assertions.
- [`task7-test-results.md`](./task7-test-results.md): recorded test count,
  test coverage, lint/build outcomes, and the corrected test-only assertion.
- [`../prompt_log_copilot_ide.md`](../prompt_log_copilot_ide.md): transcribed
   prompts and work records, including observed failures and corrections.
- Browser screenshots captured on 2026-10-29 are in [`image/`](./image/):
   [`reservation-state.png`](./image/reservation-state.png),
   [`cancellation-restored-stock.png`](./image/cancellation-restored-stock.png),
   [`concurrency-20-requests.png`](./image/concurrency-20-requests.png), and
   [`checkout-success.png`](./image/checkout-success.png). Each is also embedded
   in the prompt log with its observed result.
- Before Task 8, Git history contained 10 meaningful HW3 commits; the requested
   documentation commit is another meaningful commit. No empty commit is needed
   to meet the eight-commit requirement.

The browser screenshots are new live observations. Raw historical
compiler/linter/test failure logs were not supplied, and this guide does not
claim that such files exist.

## Additional captures still useful

Capture only genuine current results; do not recreate an old failure screenshot
or label a new run as the historical one.

1. **Current quality checks:** From `HW3`, run `npm test`, `npm run lint`, and
   `npm run build`; capture each terminal result with the command and exit
   status visible. Keep these labeled as a new run with its date, not as the
   historical output.
2. **Git history:** Run `git --no-pager log --oneline -10` from the repository
   and capture the meaningful task commits. Do not add a commit merely to pad
   the count.
3. **Historical AI errors:** If the original session/compiler/linter/test output
   is still accessible, capture the original prompt and failure together, plus
   the corresponding correction/retest. The current prompt log records these
   outcomes, but not the raw diagnostics. If unavailable, leave that limitation
   explicit; do not fabricate output.

Save genuine screenshots in `image/` with descriptive names. Save other
evidence in `evidence/` with a short caption stating what is visible and whether
it is a browser observation, automated test, or terminal run. Avoid capturing
unrelated personal data or credentials.
