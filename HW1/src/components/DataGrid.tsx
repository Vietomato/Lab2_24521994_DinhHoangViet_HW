import type { DataGridProps } from "../types/data-grid";

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  ariaLabel,
}: DataGridProps<T>) {
  if (columns.length === 0) {
    return <p>Chưa có cột để hiển thị.</p>;
  }

  return (
    <table>
      <caption>{ariaLabel}</caption>

      <thead>
        <tr>
          {columns.map(column => (
            <th key={String(column.accessorKey)} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>
              Không có dữ liệu.
            </td>
          </tr>
        ) : (
          data.map(item => (
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