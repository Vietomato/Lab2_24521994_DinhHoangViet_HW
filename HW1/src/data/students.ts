import type { Student } from "../types/student";

const sampleNames: string[] = [
  "Đinh Hoàng Việt",
  "Nguyễn Minh Anh",
  "Trần Quốc Bảo",
  "Lê Ngọc Ánh",
  "Phạm Gia Huy",
  "Hoàng Thùy Linh",
  "Vũ Đức Minh",
  "Đặng Phương Thảo",
  "Bùi Hải Đăng",
  "Đỗ Khánh Vy",
  "Hồ Tuấn Kiệt",
  "Ngô Thanh Hà",
  "Dương Nhật Nam",
  "Lý Bảo Ngọc",
  "Mai Quỳnh Như",
  "Võ Thành Đạt",
  "Nguyễn Minh Anh",
  "Trần Quốc Bảo",
  "Đinh Hoàng Việt",
  "Lê Ngọc Ánh",
];

export const students: Student[] = Array.from(
  { length: 200 },
  (_, index): Student => ({
    id: `SV${String(index + 1).padStart(4, "0")}`,
    name: sampleNames[index % sampleNames.length]!,
    gpa: ((index * 7) % 41) / 10,
  }),
);