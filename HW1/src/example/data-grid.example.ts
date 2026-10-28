import type { ColumnDef, DataGridProps } from "../types/data-grid.ts";

interface Student {
  id: string;
  name: string;
  gpa: number;
}

const columns: ColumnDef<Student>[] = [
  { header: "MSSV", accessorKey: "id" },
  { header: "Họ tên", accessorKey: "name", sortable: true },
  { header: "GPA", accessorKey: "gpa", sortable: true },
];

export const gridProps: DataGridProps<Student> = {
  data: [{ id: "SV01", name: "Hoàng Việt", gpa: 3.5 }],
  columns,
  ariaLabel: "Danh sách sinh viên",
  onRowSelect: student => {
    console.log(student.name);
  },
};