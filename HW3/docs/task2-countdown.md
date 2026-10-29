# Task 2 — Deadline countdown

`calculateRemainingTime` is a pure deadline calculation with an injectable
clock. The React hook samples it immediately, then schedules one timeout at a
time, at most once per second. Every sample uses the absolute deadline; delayed
callbacks therefore catch up instead of accumulating interval drift.

Changing the deadline replaces the previous schedule, and cleanup clears the
timeout and visibility listener. When the document becomes visible, the hook
recalculates immediately and resumes scheduling only if time remains. It stops
scheduling at zero. Callback-drift correction does not make the client clock
authoritative or guarantee accuracy against a server clock.

This module does not implement inventory or connect a countdown to the startup
page; UI integration is reserved for Task 5.
