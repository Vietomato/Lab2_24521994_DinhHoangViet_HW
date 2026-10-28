import type { GridFocus } from "../types/data-grid";

export function moveFocus(
  focus: GridFocus,
  key: string,
  rows: number,
  cols: number,
): GridFocus {
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    rows < 0 ||
    cols < 0
  ) {
    throw new RangeError(
      "rows và cols phải là số nguyên không âm.",
    );
  }

  if (rows === 0 || cols === 0) {
    return { row: 0, col: 0 };
  }

  const requestedRow = Number.isFinite(focus.row)
    ? Math.trunc(focus.row)
    : 0;

  const requestedCol = Number.isFinite(focus.col)
    ? Math.trunc(focus.col)
    : 0;

  let row = Math.min(Math.max(requestedRow, 0), rows - 1);
  let col = Math.min(Math.max(requestedCol, 0), cols - 1);

  switch (key) {
    case "ArrowUp":
      row -= 1;
      break;
    case "ArrowDown":
      row += 1;
      break;
    case "ArrowLeft":
      col -= 1;
      break;
    case "ArrowRight":
      col += 1;
      break;
    default:
      break;
  }

  return {
    row: Math.min(Math.max(row, 0), rows - 1),
    col: Math.min(Math.max(col, 0), cols - 1),
  };
}