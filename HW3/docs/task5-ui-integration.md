# Task 5 — Flash-sale UI integration

The page connects the deadline countdown, pure reservation reducer, and one
module-scoped mock service instance. The demo sale deadline is set once when the
module loads to ten minutes later; reload starts a fresh in-memory demo.

The displayed inventory starts from a service snapshot. Reserve/cancel actions
apply a separate temporary display delta while pending, then replace the
confirmed snapshot from the operation receipt. On failure, the UI refreshes from
the service and clears the delta, so a failed optimistic action is rolled back
without independently mutating service inventory.

Buttons enforce the current UI lifecycle and remain backed by service-side
validation. Loading and operation results are announced with status/alert
semantics; controls use native buttons and visible keyboard focus.

React StrictMode can run effect cleanup/setup during development. The service is
shared outside the component, so effect cleanup does not dispose it. Component
cleanup prevents late responses from updating UI; a reservation granted after
unmount is explicitly cancelled. The service's expiry timer is disposed on
`pagehide`, while hook-owned countdown timers/listeners are cleaned on unmount.

The service remains authoritative if an operation completes while UI is
unmounted. A successfully committed checkout is not undone by cleanup.
