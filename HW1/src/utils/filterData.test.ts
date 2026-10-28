import { describe, expect, it } from "vitest";
import type { ColumnDef } from "../types/data-grid";
import type { Student } from "../types/student";
import { filterData } from "./filterData";

const data: Student[] = [
  { id: "SV01", name: "Đinh Hoàng Việt", gpa: 3.5 },
  { id: "SV02", name: "Nguyễn Minh Anh", gpa: 2.8 },
  { id: "SV03", name: "Trần Hoàng Việt", gpa: 3.5 },
];

const columns: ColumnDef<Student>[] = [
  { header: "Họ tên", accessorKey: "name" },
  { header: "GPA", accessorKey: "gpa" },
];

describe("filterData", () => {
  it("tìm tiếng Việt, không phân biệt hoa thường và trim query", () => {
    expect(
      filterData(data, "  HOÀNG VIỆT  ", columns).map(x => x.id),
    ).toEqual(["SV01", "SV03"]);
  });

  it("vẫn phân biệt dấu tiếng Việt", () => {
    expect(filterData(data, "Viet", columns)).toEqual([]);
  });

  it("tìm chuỗi con trong giá trị số", () => {
    expect(
      filterData(data, "3.5", columns).map(x => x.id),
    ).toEqual(["SV01", "SV03"]);

    expect(
      filterData(data, "2", columns).map(x => x.id),
    ).toEqual(["SV02"]);
  });

  it.each(["", "   "])(
    "query %j trả bản sao toàn bộ data",
    query => {
      const result = filterData(data, query, columns);

      expect(result).toEqual(data);
      expect(result).not.toBe(data);
      result.forEach((item, index) => {
        expect(item).toBe(data[index]);
      });
    },
  );

  it("không tìm trong trường ngoài columns hoặc header", () => {
    expect(filterData(data, "SV01", columns)).toEqual([]);
    expect(filterData(data, "Họ tên", columns)).toEqual([]);
  });

  it("trả mảng rỗng khi không có kết quả", () => {
    expect(filterData(data, "không tồn tại", columns)).toEqual([]);
  });

  it("xử lý data rỗng và columns rỗng", () => {
    const empty: Student[] = [];
    const result = filterData(empty, "Việt", columns);

    expect(result).toEqual([]);
    expect(result).not.toBe(empty);
    expect(filterData(data, "Việt", [])).toEqual([]);

    const copy = filterData(data, "", []);
    expect(copy).toEqual(data);
    expect(copy).not.toBe(data);
  });

  it("bỏ qua null, undefined và các kiểu không hỗ trợ", () => {
    const mixed: { value: unknown }[] = [
      { value: null },
      { value: undefined },
      { value: true },
      { value: { name: "Việt" } },
      { value: ["Việt"] },
      { value: "Việt" },
      { value: 3.5 },
    ];

    const valueColumns: ColumnDef<{ value: unknown }>[] = [
      { header: "Giá trị", accessorKey: "value" },
    ];

    expect(filterData(mixed, "Việt", valueColumns)).toEqual([
      { value: "Việt" },
    ]);
    expect(filterData(mixed, "true", valueColumns)).toEqual([]);
    expect(filterData(mixed, "3.5", valueColumns)).toEqual([
      { value: 3.5 },
    ]);
  });

  it("không mutation; giữ thứ tự, giá trị trùng và tham chiếu", () => {
    const input = data.map(item => Object.freeze({ ...item }));
    const before = input.map(item => ({ ...item }));
    const inputColumns = columns.map(column =>
      Object.freeze({ ...column }),
    );

    Object.freeze(input);
    Object.freeze(inputColumns);

    const result = filterData(input, "3.5", inputColumns);

    expect(input).toEqual(before);
    expect(inputColumns).toEqual(columns);
    expect(result).not.toBe(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(input[0]);
    expect(result[1]).toBe(input[2]);
  });
});