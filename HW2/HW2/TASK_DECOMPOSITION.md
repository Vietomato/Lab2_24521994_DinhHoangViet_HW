# TASK_DECOMPOSITION — HW2: Audio Queue & Visualizer

## Working Rules

- Each AI prompt addresses one task below.
- Define the relevant contract before implementing each module.
- Generate → independently verify → commit.
- A task may include several closely related functions in one module.
- Do not mark a task complete before its checks pass.
- Record actual AI failures and evidence; do not invent results.

## Definition of Done

- [ ] Web Audio API playback works after user interaction.
- [ ] FIFO queue controls track downloads and decoding.
- [ ] Concurrent work has an explicit limit.
- [ ] Completion order does not change the intended playback order.
- [ ] Fetch cancellation uses AbortController.
- [ ] Results from cancelled decoding tasks are ignored.
- [ ] AudioBufferSourceNodes are stopped/disconnected appropriately.
- [ ] AnalyserNode provides frequency data to the visualizer.
- [ ] Canvas or SVG animation uses requestAnimationFrame.
- [ ] Visualization avoids React state updates on every frame.
- [ ] Unmounting cancels work and releases owned resources.
- [ ] Errors and cancellations do not stall the queue.

## Task 1 — Project Foundation and Contracts

- [X] Initialize React + TypeScript + Vite.
- [X] Configure strict TypeScript and lint scripts.
- [X] Write project-rules.md.
- [X] Define contracts for tracks, tasks, task status,
      cancellation, and queue operations.
- [X] Declare concurrency and playback-order policies.

Verify:
- Typecheck, lint, and build pass.
- The minimal application opens.

Commit:
chore(hw2): initialize project and audio contracts

## Task 2 — Audio Engine

- [X] Implement an audio-engine module.
- [X] Create/resume AudioContext after user interaction.
- [X] Play a decoded AudioBuffer.
- [X] Route source → analyser → destination.
- [X] Create a new AudioBufferSourceNode for each playback.
- [X] Handle natural completion, stop, and disconnection.
- [X] Provide an explicit disposal operation.

Verify:
- One track plays after a click.
- Stop and replay work.
- Repeated playback does not create overlapping unintended sources.

Commit:
feat(audio): implement playback engine

## Task 3 — Concurrent FIFO Queue

- [X] Implement the queue controller using the existing contracts.
- [X] Start pending tasks in FIFO order.
- [X] Limit concurrent fetch/decode tasks, initially to 2.
- [X] Check HTTP responses and decode downloaded audio.
- [X] Store completed results without changing playback order.
- [X] Settle each task promise and continue after failures.

Verify:
- Enqueue A, B, C with different completion times.
- At most 2 preparation tasks run simultaneously.
- A failed task does not block subsequent tasks.
- Successful playback candidates retain enqueue order.

Commit:
feat(queue): implement concurrent FIFO preparation

## Task 4 — Cancellation and Queue Disposal

- [X] Cancel pending and active preparation tasks.
- [X] Abort fetch using AbortController.
- [X] Ignore decode results if cancellation occurred.
- [X] Settle cancelled task promises.
- [X] Prevent late results from updating a disposed queue.
- [X] Release task references and unused buffers.

Verify:
- Cancel before start, during fetch, and during decode.
- Repeated cancellation is safe.
- The queue remains usable after cancellation.
- Disposal prevents late callbacks from changing state.

Commit:
feat(queue): add cancellation and disposal

## Task 5 — Frequency Visualizer

- [X] Implement one Canvas or SVG visualizer module.
- [X] Read frequency data from AnalyserNode.
- [X] Choose fftSize explicitly:
      512 gives 256 frequency bins;
      1024 gives 512 frequency bins.
- [X] Reuse the frequency array.
- [X] Draw through requestAnimationFrame.
- [X] Stop the animation and release references on cleanup.
- [X] Avoid React state updates on every frame.

Verify:
- The visualization responds to audio.
- Only one animation loop runs.
- Performance recording is reasonably close to 60fps
  on the test device; report actual results.

Commit:
feat(visualizer): render audio frequency spectrum

## Task 6 — Accessible UI and Integration

- [X] Connect the engine, queue, and visualizer to React.
- [X] Add track enqueue, play, stop, and cancel controls.
- [X] Display queued/loading/ready/playing/error/cancelled states.
- [X] Use semantic buttons, labels, and visible focus.
- [X] Show understandable errors.
- [X] Initialize services once per intended lifecycle.
- [X] Clean up services and animation on unmount.

Verify:
- Complete enqueue → prepare → play → finish flow.
- Controls work with keyboard.
- Repeated mount/unmount does not duplicate work.
- A cancelled or failed track does not stall the flow.

Commit:
feat(ui): integrate accessible audio queue controls

## Task 7 — Automated Verification

- [X] Add the minimum test setup needed.
- [X] Test FIFO task starts and the concurrency limit.
- [X] Test out-of-order completion and playback ordering.
- [X] Test failure recovery and promise settlement.
- [X] Test cancellation and ignored late results.
- [X] Test cleanup using suitable API mocks.

Verify:
- Tests, typecheck, lint, and build pass.
- Browser playback is also checked manually;
  mocked tests alone do not verify actual audio output.

Commit:
test(hw2): verify queue lifecycle and cancellation

## Task 8 — Evidence and Documentation

- [X] Record actual browser playback results.
- [X] Save a Performance recording or screenshots.
- [X] Inspect resource behavior across repeated play/stop cycles.
- [X] Document cancellation and cleanup checks.
- [X] Write README: setup, architecture, controls, limitations.
- [X] Document actual AI failures and manual fixes.
- [X] Review the Definition of Done.

Verify:
- Evidence corresponds to the current implementation.
- Do not claim zero memory leaks from one screenshot.
- Record unresolved issues honestly.

Commit:
docs(hw2): add verification evidence and audit