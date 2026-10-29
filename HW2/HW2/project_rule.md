# Project Rules — HW2: Concurrent FIFO Audio Visualizer

## 1. Scope

Build an audio application with:
- Web Audio API playback.
- Concurrent track downloading and decoding.
- FIFO queue management.
- Task cancellation.
- A frequency visualizer.
- Explicit resource cleanup.

Do not add unrelated features unless requested.

## 2. Technology and Structure

- Use React, TypeScript, and Vite.
- Enable strict TypeScript.
- Do not use explicit any.
- Define module contracts before implementation.
- Separate the audio engine, queue controller, visualizer,
  and React UI.
- Keep external dependencies minimal.
- Check peer dependency compatibility before installation.
- Commit package.json and package-lock.json.
- Never commit node_modules, dist, secrets, or credentials.

## 3. AI Workflow

- Follow TASK_DECOMPOSITION.md.
- Each prompt addresses one task.
- Generate one focused module or configuration unit at a time.
- A module may contain several closely related functions.
- Preserve completed functionality.
- Do not assume access to files that were not provided.
- The student creates files, runs commands, and verifies results.
- Never claim a command or test passed without actual evidence.
- Stop after the requested task.

## 4. Queue Policy

- Use a concurrency limit of 2 preparation tasks initially.
- Preparation includes fetching and decoding.
- Start pending tasks in FIFO order.
- Completion order must not change playback order.
- Play at most one track at a time.
- Failed or cancelled tasks must not block later tracks.
- Every task promise must resolve or reject exactly once.
- Assign each task a unique, stable identifier.
- Do not use the array position as task identity.
- Maintain explicit task states and valid transitions.

Suggested task states:
queued → loading → ready → playing → completed

Additional transitions:
queued/loading/ready/playing → cancelled
loading/playing → error

Reject invalid operations or handle them safely and consistently.

## 5. Audio Engine

- Create or resume AudioContext through user interaction.
- Reuse the owned AudioContext during the engine lifecycle.
- Create a new AudioBufferSourceNode for each playback.
- Connect source → analyser → destination.
- Check response.ok before decoding downloaded data.
- Handle playback completion and stop explicitly.
- Prevent stale onended callbacks from affecting a newer track.
- Do not close a shared AudioContext owned by another module.

## 6. Cancellation

- Use AbortController to cancel fetch requests.
- Do not assume AbortController cancels decodeAudioData.
- Check task validity after asynchronous operations.
- Ignore decoded results from cancelled or disposed tasks.
- Cancel queued tasks without starting their downloads.
- Release a concurrency slot only when its actual preparation
  operation has ended, including uncancellable decoding.
- Cancellation and disposal must be safe when called repeatedly.
- Distinguish cancellation from ordinary download/decode errors.

## 7. Resource Ownership and Cleanup

- Clearly define which module owns each resource.
- Stop active sources when playback is cancelled or disposed.
- Disconnect nodes when no longer needed.
- Cancel animation frames and remove registered listeners.
- Abort unnecessary fetch requests.
- Release unused AudioBuffer and task references.
- Close an owned AudioContext when the engine is disposed.
- Prevent asynchronous results from updating disposed services.
- React effect setup and cleanup must tolerate StrictMode
  setup/cleanup cycles without duplicate work.

## 8. Visualizer and Performance

- Use Canvas or SVG with requestAnimationFrame.
- Keep only one animation loop per visualizer instance.
- Do not update React state on every animation frame.
- Reuse the frequency-data array.
- Read frequency data from AnalyserNode.
- Distinguish FFT size from frequency-bin count:
  frequencyBinCount = fftSize / 2.
- Use fftSize = 512 for 256 bins,
  or fftSize = 1024 for 512 bins.
- Target smooth rendering near 60fps on the test device.
- Measure actual performance instead of assuming it.
- Do not impose a 60fps React re-render loop.

## 9. UI and Accessibility

- Use semantic buttons and properly labelled inputs.
- Provide visible keyboard focus.
- Ensure controls work with keyboard input.
- Display clear loading, playback, cancellation, and error states.
- Disable controls only when the operation is unavailable.
- Provide accessible text describing playback status;
  the visualizer must not be the only status indicator.
- Do not announce visualizer frames through live regions.
- Do not autoplay audio on page load.

## 10. Code Safety

- Use const and let; do not use var.
- Do not use raw innerHTML or dangerouslySetInnerHTML.
- Do not use HTML inline event attributes such as onclick="...".
- React event props such as onClick={handler} are allowed.
- Use keydown and event.key where keyboard handling is needed.
- Do not use keypress or keyCode.
- Use stable task IDs as React keys.
- Handle expected asynchronous failures.
- Do not hide failures using empty catch blocks.

## 11. Verification

For each task:
- Run relevant functional checks.
- Run typecheck and lint after code changes.
- Run build after configuration or integration changes.
- Record actual outcomes before marking the task complete.

Required scenarios:
- Multiple tracks queued rapidly.
- Different download/decode completion times.
- Failed download or invalid audio data.
- Cancellation before start and during preparation.
- Cancellation during playback.
- Repeated play/stop operations.
- Component unmount and service disposal.
- No unintended duplicate playback or animation loops.

Automated tests must cover queue ordering, concurrency,
failure recovery, cancellation, and cleanup.
Verify real audio playback manually in the browser.

## 12. Git and Evidence

- Make one focused commit after each completed WBS task.
- Use Conventional Commits.
- Include only files related to the task.
- Review staged changes before committing.
- Save actual verification evidence under evidence/.
- Document observed AI failures in AI_FAILURE_AUDIT.md.
- Separate expected results from observed results.
- Do not fabricate bugs, screenshots, test outcomes,
  performance measurements, or memory-leak claims.