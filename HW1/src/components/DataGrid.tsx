import { useId, useState } from "react";
import type {
  DataGridProps,
  SortState,
} from "../types/data-grid";
import { filterData } from "../utils/filterData";
import { paginate } from "../utils/paginate";
import { sortData } from "../utils/sortData";

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

  // Lọc → sắp xếp → phân trang.
  const filteredData = filterData(data, query, columns);
  const sortedData = sortData(filteredData, sortState);
  const pagination = paginate(sortedData, page, PAGE_SIZE);

  // Đồng bộ state nếu dữ liệu thay đổi làm trang hiện tại vượt biên.
  // Có điều kiện nên render tiếp theo sẽ không cập nhật lại.
  if (page !== pagination.page) {
    setPage(pagination.page);
  }

  function handleQueryChange(value: string): void {
    setQuery(value);
    setPage(0);
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

      <table>
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
          {pagination.items.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {data.length === 0
                  ? "Không có dữ liệu."
                  : "Không tìm thấy kết quả phù hợp."}
              </td>
            </tr>
          ) : (
            pagination.items.map(item => (
              <tr key={item.id}>
                {columns.map(column => {
                  const value = item[column.accessorKey];

                  const content =
                    typeof value === "string" ||
                    typeof value === "number"
                      ? value
                      : "—";

                  return (
                    <td key={String(column.accessorKey)}>
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
          onClick={() => setPage(pagination.page - 1)}
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
              onClick={() => setPage(pageIndex)}
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
          onClick={() => setPage(pagination.page + 1)}
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