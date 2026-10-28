# Project Rules: Accessible Data Grid

##1. Scope
- Build a table data structure for sorting, filtering, and pagination.

- Support row selection and keyboard controls.

##2. Technology and Code Organization
- Use React, TypeScript, and Vite.

- Define data interfaces, ColumnDef, and DataGridProps before development declarations. (Explain to developers before recommending them in source code.)

- Show separate logical data processing components.

- Use stable IDs as keys; do not use Math.random() or indexes.

##3. Data Processing
- Processing order: filter → sort → pagination.

- Props or state cannot be changed directly.

- When the filter changes, the page returns to the top.

- Handle cases of empty data and no results found.

## 4. HTML and Accessibility
- Use table, thead, tbody, tr, th, td, and button.

- Header columns must have range="col".

- Implement ARIA Grid terminology according to requirements.

- Navigation arrows between cells.

- Type select; Space toggles selection.

- Use dynamic tabindex and clearly display focus.

- Input cells must have labels; buttons must have clear access permissions.

- Update aria-sort when the sorting order changes.

- Meet WCAG 2.2 AA; normal text contrast at a minimum of 4.5:1.

## 5. Safety and Testing
- Do not use var, inline HTML event handlers, or raw InternalHTML.

- Test all keyboard operations.

- Test screen reader compatibility.

- - Accessibility of the lighthouse and best practices must reach 100 as per the requirements.

- No single Lighthouse score is the sole evidence of accessibility.

## 6. AI Usage Process
- Break down the request into smaller tasks in TASK_DECOMPOSITION.md.

- Each AI Development request declares a function or module.

- Read, check, and decode appropriately before committing.