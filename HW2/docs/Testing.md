# Task 7 - Automated Verification

This package is written based on HW2(1).zip. Do not change the contract, engine,
queue, visual renderer, audio session, App.tsx, main.tsx, or CSS.

No WBS signatures or auto-commits.

## Installation

Extract to the folder containing package.json (HW2/HW2 on Vietnamese machines).
The package contains only new files and updated configuration files:
pack.json, package-lock.json, tsconfig.node.json.

If the files have changed after submitting the ZIP, compare them before applying.

Node used for verification: v24.22.1. Additional dependencies:
vitest 5.0.5 and jsdom 30.1.3 (correct pin).

jsdom 30.1.3 request Node ^22.22.2 || ^24.15.0 || >=26.0.0.

Do not use --force or --legacy-peer-deps when encountering dependency errors.

``` power
node -v
npm ci --strict-peer-deps
npm test
npm run test type error
npm run lint
npm run build
```

If automatically generating the file from code instead of using the package/key in the package:

``` power
npm install -D --save-exact vitest@5.0.5 jsdom@30.1.3 --strict-peer-deps
```

Add the script (keep the other scripts):

```json
"test": "vitest run",

"test:watch": "vitest"
```

In tsconfig.node.json, add vitest.config.ts to include edge
vite.config.ts to type the test config. No need to edit tsconfig.app.json

or ESLint; the tests import the Vitest API directly, not using the global test API.

No testing-library, jest-dom, native canvas, or audio files needed.

## New Files and Gameplay

- vitest.config.ts: jsdom; only searches src/**/*.test.ts or .tsx; automatically restores spyware

and Global stub between tests; JSX uses Oxc/Vite 8's auto-runtime.

- src/test/helpers.ts: deferred promises, microtasks, Web Audio/Canvas/rAF doubles.

- src/queue/preparation-queue.test.ts: 13 FIFO tests, concurrency, and cancel.

- src/audio/audio-engine.test.ts: 5 tests for operation, source lifecycle, and processing.

- src/visualizer/canvas-visualizer.test.ts: 1 test for rAF, array reuse, and cleanup.

- src/player/audio-session.test.ts: 5 tests merging actual modules with a mock browser.

- src/App.test.tsx: 3 React StrictMode tests: controls, state, errors, and unmount.

##Testing Time Control

Deferred promises allow the test engine to resolve/reject fetch or decode.

No setTimeout waits 1 second, real network, or Math.random.

Flush only exits a threaded micro-task constraint, not waits for execution time.
A mock timer controls the 200ms duration of the session.
requestAnimationFrame saves the callback in Map; frame() runs a manual frame.

Mock stops do not automatically call immediately, to check the old callback after the new track runs.

AudioBuffer/AnalyserNode/Canvas types are allowed to be forced only during double checks,
model true production methods are used; no use of any and no audio quality settings are used.

## Behavioral Coverage

| Version | Assured |

| --- | --- |

| A–B–C, B/C completes before A | B/C not received/played; then plays A B C |

| Simultaneously | Only A/B starts; C does not start while A/B is still decoding; task batch 8 does not pass 2 |

| Failure | Network, HTTP 404, read response content and decode error still for the following task to run |

| Promise resolution | Track declared results, call back once after cancellation/error/handling; Promise.all complete | | Cancel queued task | No fetching call for that task |

| Cancel fetch | AbortSignal.aborted, subsequent task still runs |

| Cancel on read content | Incoming content not called for decoding |

| Cancel decoding | Slot still used for actual resolution/rejection; no change canceled to ready/error |

| Skip transport process | Successful fetch but no decoding call |

| Cancel ready task | No candidate remaining; promise ready but no change to result |

| Queue | Normal; resolve queue/load; cancel fetch; wait for decoding; empty snapshot, active 0 after completion |

| Engine | No automatic context creation, continue/reuse, new source, overlapping blocking, natural end/stop/start error |

| Old callback | No unpacking or new playback completion |

| Session | No autoplay; no stuck errors; stop holding unplayed tracks; pre-process engine.close awaiting decoding |

| Display | One rAF waiting; same array of 256 bins; stop/discard round drawing |

| Reactions | StrictMode only has one polling timer left; live labels/status; add/play/stop/cancel; read error |

| Disconnects | Cancel fetch, close context exactly once; timer no longer available |

The resolution is proven by action certificates via survey contract (promise/result/callback),

no internal access or modification of variables.
Queueing manages preparation/delivery; order and maximum one time checked
added in session using real engine and Web Audio mock, not replaced by mock.

## Actual results on unzipped version in test environment

Test date: 29-10-2026; Node v24.22.1; Linux; Vitest v5.0.5.

- npm install