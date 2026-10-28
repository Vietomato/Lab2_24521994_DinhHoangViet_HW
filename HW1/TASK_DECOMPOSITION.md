# TASK_DECOMPOSITION.md — HW1: Production Enterprise Data-Grid (WCAG 2.2 AA)

> **RULE:** Never prompt AI with more than 1 sub-task at once. / Mỗi prompt AI chỉ 1 task.
> **Pipeline:** Slice → Contract → Atomic Gen → Independent Verify → Atomic Commit.

## 0. Goal & Definition of Done (DoD)
- [ ] Data-Grid with **sorting, filtering, pagination**
- [ ] WCAG 2.2 AA (contrast ≥ 4.5:1, screen-reader support, visible focus)
- [ ] Keyboard: Arrow keys move between cells; Enter selects; Space toggles
- [ ] Lighthouse **100/100** Accessibility + Best Practices (screenshot in `/evidence`)
- [ ] Zero div-soup: native `<table> <thead> <tbody> <th scope="col"> <button>`
- [ ] No `var`, `innerHTML`, `keypress`/`keyCode`, inline handlers
- [ ] `AI_FAILURE_AUDIT.md` ≥ 3 entries with proof

## 1. Contract (Stage 2) — write BEFORE any AI generation
```ts
export interface ColumnDef<T> { header: string; accessorKey: keyof T; sortable?: boolean; }
export interface DataGridProps<T> {
  data: T[]; columns: ColumnDef<T>[];
  onRowSelect?: (item: T) => void; ariaLabel: string;
}
type SortState<T> = { key: keyof T; dir: 'asc' | 'desc' } | null;
type GridFocus = { row: number; col: number };
```
Invariants: (1) exactly one cell has `tabIndex=0` (roving tabindex); (2) `aria-sort` only on the sorted `<th>`; (3) page index always within `[0, pageCount-1]`.

## 2. Work Breakdown Structure
### Phase A — Foundation
- [ ] **1.1** Scaffold Vite + TS + ESLint (`react-hooks`, `jsx-a11y`) — `chore(init): scaffold vite ts project`
- [ ] **1.2** Write `project-rules.md` (banned patterns, a11y rules) — `docs(rules): add project rules`
- [ ] **1.3** Define types/contract above — `feat(types): define grid contracts`
- [ ] **1.4** Create sample dataset (≥ 200 rows, stable `id`) — `chore(data): add mock dataset`
### Phase B — Pure logic (no UI, unit-testable)
- [ ] **2.1** `sortData(data, sortState)` (stable, locale-aware, no mutation) — `feat(logic): implement sortData`
- [ ] **2.2** `filterData(data, query, columns)` — `feat(logic): implement filterData`
- [ ] **2.3** `paginate(data, page, size)` + clamp — `feat(logic): implement paginate`
- [ ] **2.4** `moveFocus(focus, key, rows, cols)` (arrow keys, clamped) — `feat(a11y): implement focus navigation`
- [ ] **2.5** Unit tests for 2.1–2.4 (incl. empty data, ties, out-of-range) — `test(logic): add unit tests`
### Phase C — Semantic UI
- [ ] **3.1** Static `<table>` markup: `<caption>`/`aria-label`, `<thead>`, `<th scope="col">`, `<tbody>` — `feat(ui): semantic table skeleton`
- [ ] **3.2** Sortable header as `<button>` + `aria-sort` — `feat(ui): sortable headers`
- [ ] **3.3** Filter input with `<label>` + live region (`aria-live="polite"`) for result count — `feat(ui): filter control`
- [ ] **3.4** Pagination `<nav aria-label>` with `<button>`s, `aria-current="page"` — `feat(ui): pagination`
- [ ] **3.5** Roving tabindex + `keydown` (`e.key`) handler via delegation — `feat(a11y): keyboard navigation`
- [ ] **3.6** Enter = select (`onRowSelect`), Space = toggle (`aria-selected`/`aria-pressed`); `preventDefault` on Space — `feat(a11y): select and toggle`
- [ ] **3.7** Row `key={row.id}` (NOT index) — verify with sorting
### Phase D — Accessibility & Quality
- [ ] **4.1** Contrast check all tokens ≥ 4.5:1 (text) / 3:1 (UI); `:focus-visible` ring — `style(a11y): contrast and focus`
- [ ] **4.2** Screen-reader pass (NVDA/VoiceOver): record notes in `/evidence/sr-notes.md`
- [ ] **4.3** Lighthouse run → 100/100, save report — `docs(evidence): lighthouse report`
- [ ] **4.4** Fill `AI_FAILURE_AUDIT.md` (≥ 3) — `docs(audit): add AI failure audit`

## 3. Verification Checklist (Stage 4)
| Check | Tool | Pass criteria | Evidence |
|---|---|---|---|
| Semantics | DevTools Elements / axe | no div-soup, no ARIA errors | `/evidence/axe.png` |
| Keyboard only | Manual | full flow without mouse | `/evidence/keyboard.mp4` |
| Contrast | DevTools / WebAIM | ≥ 4.5:1 | |
| Lighthouse | Chrome | 100 / 100 | `/evidence/lighthouse.png` |
| Re-render/keys | React Profiler | rows not remounted on sort | |

## 4. Live Defense Prep (3 min)
- [ ] Can I change `aria-sort` logic live? Add a column? Change page size?
- [ ] Can I explain why roving tabindex beats `tabindex=0` on every cell?
