# Task 1 — Setup and local verification

Copy these files into the EMPTY HW3 directory; do not create another nested HW3.
Run commands in the directory containing package.json.

## Files

- package.json / package-lock.json: dependencies and reproducible install.
- tsconfig.json: references app and Node configuration projects.
- tsconfig.app.json: strict TS, DOM/DOM.Iterable, JSX, bundler module resolution, no emit.
- tsconfig.node.json: strict TS for vite.config.ts.
- vite.config.ts: React plugin.
- eslint.config.js: JS/TS, React Hooks, Fast Refresh and explicit-any prohibition.
- index.html: Vietnamese document language, viewport and React root.
- src/main.tsx: root validation and StrictMode.
- src/App.tsx: static startup page only; no CSS, sale UI, hooks or service behavior.
- src/vite-env.d.ts: Vite client types and asset declarations.
- src/contracts/flash-sale.ts: complete exported domain/service/UI-state contracts.
- docs/task1-contracts.md: decisions, intended semantics and limits of the contracts.
- project-rules.md / TASK_DECOMPOSITION.md: exact copies of the supplied HW3 rules/WBS,
  with normalized filenames and all completion checkboxes left unchanged.
- .gitignore: excludes dependencies, build output and environment secrets.

TypeScript ~5.9.3 is deliberate: typescript-eslint 8.72.x declares TypeScript
>=4.8.4 <6.1.0. Do not automatically switch to TypeScript 7 while keeping that parser.
React Hooks/refresh plugins are development lint tools; no UI/runtime library is added.
Vitest and jsdom are deferred to Task 7.

## Commands on Windows / PowerShell

Check Node (Node v24.22.1 used for this package's verification):

```powershell
node -v
npm -v
npm ci --strict-peer-deps
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open the URL Vite prints. Expected page:
- Flash-Sale E-Commerce Engine
- Đã khởi tạo React, TypeScript và Vite.
- Task 1: cấu hình dự án và định nghĩa contracts.

No sale timer, product inventory panel, reservation buttons, network operation
or service should run yet.

With a new package.json and no lockfile, use npm install --strict-peer-deps once
instead of npm ci. Commit the generated lockfile. Do not use force/legacy-peer-deps
to bypass a peer mismatch.

Optional production preview after building:

```powershell
npm run preview
```

## Checking the discriminated union

Temporarily create src/contracts/contract-check.ts:

```ts
import type { ReservationState } from "./flash-sale";

export const valid: ReservationState = {
  status: "RESERVING",
  requestId: "request-1",
  idempotencyKey: "reserve-action-1",
};
```

Run npm run typecheck: expected pass. Change status to RESERVED without adding
reservation: expected TypeScript error because confirmed hold data is required.
Delete this temporary file after the check; it is not part of the deliverable.

Timestamps are numeric aliases: TypeScript does not automatically distinguish
saleEndsAt from expiresAt at runtime. Separate fields plus service rules preserve
that distinction. No source function has been written to enforce it yet.

## Checklist and commit

After checks pass on YOUR machine and the startup page opens, update only Task 1
checkboxes that you actually verified. Do not mark Tasks 2–8 complete.

```powershell
git status --short
git add .gitignore package.json package-lock.json index.html vite.config.ts eslint.config.js
git add tsconfig.json tsconfig.app.json tsconfig.node.json
git add src/main.tsx src/App.tsx src/vite-env.d.ts src/contracts/flash-sale.ts
git add project-rules.md TASK_DECOMPOSITION.md docs/task1-contracts.md docs/task1-setup.md
git diff --cached --check
git diff --cached --stat
git diff --cached
git commit -m "chore(hw3): initialize project and contracts"
```

No commit or checklist update has been performed for you.

## Observed verification of this deliverable

Checked in the assistant's separate Linux workspace, Node v24.22.1:
- npm install --strict-peer-deps: passed; 160 packages installed.
- npm run typecheck: passed.
- npm run lint: passed (zero errors/warnings reported by ESLint).
- npm run build: passed; Vite 8.3.5, 15 modules transformed.

The browser startup page has not been opened or manually verified by the assistant.
No command has been run on the student's Windows machine. Local verification is
still required before updating Task 1 checkboxes or committing.
