import { DataGrid } from "./components/DataGrid";
import { students } from "./data/students";
import type { ColumnDef } from "./types/data-grid";
import type { Student } from "./types/student";

const columns: ColumnDef<Student>[] = [
  { header: "Mã sinh viên", accessorKey: "id" },
  { header: "Họ tên", accessorKey: "name", sortable: true },
  { header: "GPA", accessorKey: "gpa",sortable: true },
];

export default function App() {
  return (
    <main>
      <h1>HW1: Accessible Data Grid</h1>

      <DataGrid
        data={students}
        columns={columns}
        ariaLabel="Danh sách sinh viên"
        onRowSelect={student => {
  console.log("Đã chọn:", student);
}}
      />
    </main>
  );
}