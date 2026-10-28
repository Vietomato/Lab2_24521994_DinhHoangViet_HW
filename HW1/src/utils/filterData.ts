import type { ColumnDef } from "../types/data-grid";

export function filterData<T>(
  data: T[],
  query: string,
  columns: ColumnDef<T>[],
): T[] {
  const keyword = query.trim().toLocaleLowerCase("vi");

  if (keyword === "") {
    return [...data];
  }

  return data.filter(item =>
    columns.some(column => {
      const value = item[column.accessorKey];

      if (typeof value !== "string" && typeof value !== "number") {
        return false;
      }

      return String(value)
        .toLocaleLowerCase("vi")
        .includes(keyword);
    }),
  );
}