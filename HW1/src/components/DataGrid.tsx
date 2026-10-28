import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent } from "react";
import type {
  DataGridProps,
  GridFocus,
  SortState,
} from "../types/data-grid";
import { filterData } from "../utils/filterData";
import { moveFocus } from "../utils/moveFocus";
import { paginate } from "../utils/paginate";
import { sortData } from "../utils/sortData";
import "./DataGrid.css";

const PAGE_SIZE = 10;

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  ariaLabel,
}: DataGridProps<T>) {
  const searchId = useId();

  const [query, setQuery] = useState("");
  const [sortState, setSortState] = useState<SortState<T>>(null);
  const [page, setPage] = useState(0);
  const [focus, setFocus] = useState<GridFocus>({
    row: 0,
    col: 0,
  });

  const tableRef = useRef<HTMLTableElement>(null);
  const cellFocusActive = useRef(false);

  const filteredData = filterData(data, query, columns);
  const sortedData = sortData(filteredData, sortState);
  const pagination = paginate(sortedData, page, PAGE_SIZE);

  if (page !== pagination.page) {
    setPage(pagination.page);
  }

  const rows = pagination.items.length;
  const cols = columns.length;
  const visibleFocus = moveFocus(focus, "", rows, cols);

  // Khôi phục focus sau khi React cập nhật các ô.
  useLayoutEffect(() => {
    const table = tableRef.current;

    if (table === null || !cellFocusActive.current) {
      return;
    }

    const activeElement = document.activeElement;

    const activeCell =
      activeElement instanceof HTMLTableCellElement &&
      activeElement.matches("td[data-grid-cell]") &&
      activeElement.closest("table") === table;

    // Không lấy focus khỏi input, button hoặc phần tử bên ngoài.
    if (!activeCell && activeElement !== document.body) {
      cellFocusActive.current = false;
      return;
    }

    if (rows === 0 || cols === 0) {
      cellFocusActive.current = false;
      table.focus();
      return;
    }

    const nextCell = table.querySelector<HTMLTableCellElement>(
      `td[data-grid-cell][data-row="${visibleFocus.row}"]` +
        `[data-col="${visibleFocus.col}"]`,
    );

    if (nextCell !== null && nextCell !== activeElement) {
      nextCell.focus();
    }
  });

  function handleQueryChange(value: string): void {
    setQuery(value);
    setPage(0);
    setFocus({ row: 0, col: 0 });
  }

  function handlePageChange(nextPage: number): void {
    setPage(nextPage);
    setFocus({ row: 0, col: 0 });
  }

  function handleSort(key: keyof T): void {
    setSortState(current => ({
      key,
      dir:
        current?.key === key && current.dir === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function handleGridKeyDown(
    event: KeyboardEvent<HTMLTableElement>,
  ): void {
    if (
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    const cell = event.target;

    // Chỉ xử lý khi chính ô dữ liệu đang focus.
    // Không can thiệp vào button hoặc input.
    if (
      !(cell instanceof HTMLTableCellElement) ||
      !cell.matches("td[data-grid-cell]") ||
      cell.closest("table") !== event.currentTarget
    ) {
      return;
    }

    const nextFocus = moveFocus(
      {
        row: Number(cell.dataset.row),
        col: Number(cell.dataset.col),
      },
      event.key,
      rows,
      cols,
    );

    event.preventDefault();
    setFocus(nextFocus);

    const nextCell =
      event.currentTarget.querySelector<HTMLTableCellElement>(
        `td[data-grid-cell][data-row="${nextFocus.row}"]` +
          `[data-col="${nextFocus.col}"]`,
      );

    nextCell?.focus();
  }

  if (columns.length === 0) {
    return <p>Chưa có cột để hiển thị.</p>;
  }

  return (
    <div>
      <div>
        <label htmlFor={searchId}>
          Tìm kiếm trong {ariaLabel}
        </label>

        <input
          id={searchId}
          type="search"
          value={query}
          onChange={event => handleQueryChange(event.target.value)}
        />
      </div>

      <p role="status" aria-live="polite" aria-atomic="true">
        Có {filteredData.length} kết quả trên tổng số {data.length} dòng.
      </p>

      <table
        ref={tableRef}
        role="grid"
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleGridKeyDown}
        onFocusCapture={event => {
          const target = event.target;

          if (
            target instanceof HTMLTableCellElement &&
            target.matches("td[data-grid-cell]") &&
            target.closest("table") === event.currentTarget
          ) {
            cellFocusActive.current = true;

            const row = Number(target.dataset.row);
            const col = Number(target.dataset.col);

            setFocus(current =>
              current.row === row && current.col === col
                ? current
                : { row, col },
            );
          } else {
            cellFocusActive.current = false;
          }
        }}
        onBlurCapture={event => {
          const nextTarget = event.relatedTarget;

          // Khi ô bị xóa, relatedTarget có thể là null.
          // Effect kiểm tra lại DOM sau cập nhật.
          if (nextTarget === null) {
            return;
          }

          cellFocusActive.current =
            nextTarget instanceof HTMLTableCellElement &&
            nextTarget.matches("td[data-grid-cell]") &&
            nextTarget.closest("table") === event.currentTarget;
        }}
      >
        <caption>{ariaLabel}</caption>

        <thead>
          <tr>
            {columns.map(column => {
              const isSorted = sortState?.key === column.accessorKey;

              const ariaSort = isSorted
                ? sortState.dir === "asc"
                  ? "ascending"
                  : "descending"
                : undefined;

              const indicator = isSorted
                ? sortState.dir === "asc"
                  ? " ↑"
                  : " ↓"
                : "";

              return (
                <th
                  key={String(column.accessorKey)}
                  scope="col"
                  aria-sort={ariaSort}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.accessorKey)}
                    >
                      {column.header}
                      <span aria-hidden="true">{indicator}</span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows === 0 ? (
            <tr>
              <td role="gridcell" colSpan={cols}>
                {data.length === 0
                  ? "Không có dữ liệu."
                  : "Không tìm thấy kết quả phù hợp."}
              </td>
            </tr>
          ) : (
            pagination.items.map((item, rowIndex) => (
              <tr key={item.id}>
                {columns.map((column, colIndex) => {
                  const value = item[column.accessorKey];

                  const content =
                    typeof value === "string" ||
                    typeof value === "number"
                      ? value
                      : "—";

                  const isTabStop =
                    rowIndex === visibleFocus.row &&
                    colIndex === visibleFocus.col;

                  return (
                    <td
                      key={String(column.accessorKey)}
                      role="gridcell"
                      data-grid-cell=""
                      data-row={rowIndex}
                      data-col={colIndex}
                      tabIndex={isTabStop ? 0 : -1}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <nav aria-label={`Phân trang ${ariaLabel}`}>
        <button
          type="button"
          disabled={pagination.pageCount === 0 || pagination.page === 0}
          onClick={() => handlePageChange(pagination.page - 1)}
        >
          Trang trước
        </button>

        {Array.from(
          { length: pagination.pageCount },
          (_, pageIndex) => (
            <button
              key={`page-${pageIndex}`}
              type="button"
              aria-label={`Trang ${pageIndex + 1}`}
              aria-current={
                pageIndex === pagination.page ? "page" : undefined
              }
              onClick={() => handlePageChange(pageIndex)}
            >
              {pageIndex + 1}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={
            pagination.pageCount === 0 ||
            pagination.page >= pagination.pageCount - 1
          }
          onClick={() => handlePageChange(pagination.page + 1)}
        >
          Trang sau
        </button>

        <p>
          {pagination.pageCount === 0
            ? "Không có trang dữ liệu."
            : `Trang ${pagination.page + 1} / ${pagination.pageCount}`}
        </p>
      </nav>
    </div>
  );
}