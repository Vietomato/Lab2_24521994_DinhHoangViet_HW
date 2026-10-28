import { useState } from "react";
import type {
  DataGridProps,
  SortState,
} from "../types/data-grid";
import { sortData } from "../utils/sortData";

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  ariaLabel,
}: DataGridProps<T>) {
  const [sortState, setSortState] = useState<SortState<T>>(null);

  const sortedData = sortData(data, sortState);

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
              Không có dữ liệu.
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
  );
}