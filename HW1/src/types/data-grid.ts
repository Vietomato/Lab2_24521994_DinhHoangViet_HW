export interface ColumnDef<T> {
  header: string;
  accessorKey: keyof T;
  sortable?: boolean;
}

export interface DataGridProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowSelect?: (item: T) => void;
  ariaLabel: string;
}

export type SortState<T> = {
  key: keyof T;
  dir: "asc" | "desc";
} | null;

export type GridFocus = {
  row: number;
  col: number;
};

// Kiểu dữ liệu của một dòng
interface Student {
  id: number;
  name: string;
  score: number;
}

// Dữ liệu mẫu để kiểm tra contract
export const studentGridExample: DataGridProps<Student> = {
  data: [
    { id: 1, name: "Hoàng Việt", score: 8 },
    { id: 2, name: "Minh Anh", score: 9 },
  ],
  columns: [
    { header: "Mã sinh viên", accessorKey: "id" },
    { header: "Họ tên", accessorKey: "name", sortable: true },
    { header: "Điểm", accessorKey: "score", sortable: true },
  ],
  ariaLabel: "Bảng điểm sinh viên",
};
