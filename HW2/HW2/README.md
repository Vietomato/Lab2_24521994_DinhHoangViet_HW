# Concurrent FIFO Audio Visualizer

A React and TypeScript application demonstrating concurrent audio preparation, FIFO playback, cancellation, and frequency visualization using the Web Audio API.

Audio preparation runs with a concurrency limit of **2**, while playback is limited to **one track at a time**.

## Technology Stack

- React
- TypeScript with strict mode
- Vite
- Web Audio API
- Canvas API
- ESLint
- Vitest and jsdom for automated testing

## Features

- Initialize or resume audio through user interaction.
- Add audio tracks using a title and URL.
- Download and decode up to two tracks concurrently.
- Preserve FIFO playback order despite out-of-order preparation completion.
- Play, stop, and cancel tracks.
- Continue processing after individual task failures.
- Display task states and readable errors.
- Render a frequency spectrum using an AnalyserNode.
- Clean up audio sources, animation frames, timers, and pending requests.

## Requirements

- Node.js compatible with the installed dependencies.
- Node.js **24.22.1** was used for automated verification.
- npm
- A modern browser supporting the Web Audio API and Canvas.

The test setup uses Vitest 5.0.5 and jsdom 30.1.3.

## Installation

Run these commands from the directory containing `package.json`:

```bash
npm ci --strict-peer-deps
npm run dev
```

Open the local URL printed by Vite.

To create and preview a production build:

```bash
npm run build
npm run preview
```

## Using the Application

1. Click **Khởi tạo âm thanh** to initialize the audio engine.
2. Enter a track title and audio URL.
3. Click **Thêm bài** to enqueue the track.
4. Add more tracks if needed.
5. Click **Phát hàng đợi** to start FIFO playback.
6. Click **Dừng** to stop the current playback.
7. Use a task’s **Hủy** button to cancel it.

Audio does not start automatically when the page loads or a track is added.

Stopping playback cancels the current playback attempt. Tracks that have not
been played remain in the queue. Add a stopped track again to replay it from
the beginning.

While queue playback is running, subsequent eligible tracks start
automatically after the current track finishes.

## Local Audio File

Place a supported audio file at:

```text
public/audio/demo.mp3
```

Use this URL in the application:

```text
/audio/demo.mp3
```

Files inside `public` are served from the application root, so the URL must
not include `/public`.

External audio URLs must allow cross-origin requests when required.
Decoding also depends on browser support for the file’s audio format.

## Project Structure

| Path | Responsibility |
| --- | --- |
| `src/contracts/audio.ts` | Audio engine and playback contracts |
| `src/contracts/preparation.ts` | Preparation task, queue, and cancellation contracts |
| `src/audio/audio-engine.ts` | AudioContext ownership, decoding, playback, and disposal |
| `src/queue/preparation-queue.ts` | Concurrent preparation and FIFO result delivery |
| `src/visualizer/canvas-visualizer.ts` | Frequency rendering and animation cleanup |
| `src/player/audio-session.ts` | Coordination between the engine, queue, visualizer, and UI |
| `src/App.tsx` | User controls and task status display |
| `src/test/helpers.ts` | Controlled promises and browser API test doubles |
| `src/**/*.test.ts` | Module and integration tests |
| `src/App.test.tsx` | React UI and StrictMode tests |
| `vitest.config.ts` | Automated test configuration |
| `docs/task7-testing.md` | Test coverage, commands, and verification notes |

## Queue and Playback Policies

### Concurrent Preparation

Preparation includes fetching, reading the response body, and decoding.

At most two preparation operations run concurrently. Pending tasks start in
enqueue order.

A concurrency slot remains occupied until the actual preparation operation
finishes, including decoding that cannot be cancelled.

### FIFO Playback

Preparation completion order does not determine playback order.

For example:

```text
Enqueue order:               A → B → C
Preparation completion:     B → C → A
Playback order:              A → B → C
```

A ready track waits if an earlier eligible track is still being prepared.
Failed or cancelled tasks are skipped.

The session starts the next track only after the active playback ends or is
cancelled. The audio engine also rejects overlapping playback attempts.

### Task Identity and Settlement

Tasks receive unique, stable IDs.

Each preparation promise settles once with a ready, error, or cancellation
outcome. Cancelling an already prepared task removes its playback eligibility
without changing the result of its previously settled promise.

## Cancellation and Disposal

- Queued tasks can be cancelled before fetching starts.
- Active fetch requests receive cancellation through AbortController.
- AbortController does not cancel audio decoding.
- Results arriving after cancellation are ignored.
- Repeated cancellation and disposal calls are handled safely.
- Queue disposal waits for active preparation operations to finish.
- Session disposal waits for queue cleanup before disposing the engine.

If an underlying operation does not finish, disposal may remain pending.
Cancellation cannot forcibly terminate an uncancellable decode operation.

## Audio Engine

The engine creates or resumes its owned AudioContext through an explicit
user action.

Each playback creates a new AudioBufferSourceNode:

```text
AudioBufferSourceNode → AnalyserNode → AudioContext.destination
```

Natural completion and explicit stopping release the source. Playback
identity checks prevent callbacks from an older source from affecting a
newer playback.

## Visualizer

The visualizer uses:

- `fftSize = 512`
- `frequencyBinCount = 256`
- One reusable frequency-data array
- One requestAnimationFrame loop per visualizer instance

React state is not updated on every animation frame.

Stopping or disposing the visualizer cancels its pending animation frame.

## Accessibility

The UI includes:

- Semantic buttons and forms
- Explicit input labels
- Visible focus indicators
- Text descriptions of task and playback states
- A polite live region for status messages
- Descriptive cancellation button names

The visualizer is not the only source of playback status.

Keyboard interaction, screen-reader behavior, and visual contrast still
require manual verification in the browser. Automated DOM tests do not
establish full accessibility compliance.

## Automated Tests

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run the queue tests only:

```bash
npm test -- src/queue/preparation-queue.test.ts
```

Run the project checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Tests use controlled promises, fake timers, and Web Audio, fetch, Canvas,
and animation-frame mocks.

They do not use real network requests, random delays, or audio playback.

### Test Coverage

- FIFO preparation starts and result delivery
- Maximum preparation concurrency of two
- Out-of-order completion
- Recovery after network, HTTP, response-body, and decoding failures
- Preparation promise settlement
- Cancellation before execution, during fetch, and during decoding
- Late results after cancellation or disposal
- Playback serialization and stale completion callbacks
- Source and animation cleanup
- React StrictMode and component unmounting

## Verification Status

The following results were observed on the extracted project with the
Task 7 test additions, using Node.js 24.22.1 on Linux.

| Check | Observed Result |
| --- | --- |
| Automated tests | 27 passed across 5 test files |
| TypeScript | Passed |
| Production build | Passed |
| Lint for new test/config files | Passed |
| Project-wide lint | Failed: one existing error in `src/main.tsx` |

The project-wide lint error concerns the temporary `LifecycleCheck`
component in the entry file:

```text
react-refresh/only-export-components
```

Move the lifecycle test component into a separate component file or restore
the minimal application entry, then rerun lint.

These results do not establish that all checks pass on another machine.
Run the commands locally before marking the task complete.

## Manual Browser Verification

Verify the following separately:

- Audio starts only after user interaction.
- Local audio plays and stops correctly.
- Multiple tracks play in FIFO order.
- Cancelling a playing track allows the queue to continue.
- Invalid URLs and invalid audio files produce readable errors.
- Controls work using the keyboard.
- Repeated mounting and unmounting does not cause duplicate playback.
- Animation stops during cleanup.

Use Chrome Performance to inspect rendering behavior. Actual frame-rate
measurements are still pending; no 60 FPS or zero-memory-leak claim is made.

## Limitations

- Stopped tracks do not resume from their previous position.
- Taken or completed tracks must be added again for replay.
- Audio decoding cannot be forcibly cancelled.
- External URLs depend on server CORS settings.
- Mocked tests do not verify actual audio output.
- Browser performance and assistive-technology behavior require manual checks.

## Scope

This project demonstrates concurrent preparation, FIFO playback,
cancellation, lifecycle management, and audio visualization.

It does not currently implement seeking, persistent playlists, volume
controls, or playback-position restoration.