import { useId, useState } from "react";
import type {
  DataGridProps,
  SortState,
} from "../types/data-grid";
import { filterData } from "../utils/filterData";
import { sortData } from "../utils/sortData";

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  ariaLabel,
}: DataGridProps<T>) {
  const searchId = useId();

  const [query, setQuery] = useState("");
  const [sortState, setSortState] = useState<SortState<T>>(null);

  // Lọc trước, sắp xếp sau.
  const filteredData = filterData(data, query, columns);
  const sortedData = sortData(filteredData, sortState);

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
          onChange={event => setQuery(event.target.value)}
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
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {data.length === 0
                  ? "Không có dữ liệu."
                  : "Không tìm thấy kết quả phù hợp."}
              </td>
            </tr>
          ) : (
            sortedData.map(item => (
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
    </div>
  );
}