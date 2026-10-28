import { describe, expect, it } from "vitest";
import { sortData } from "./sortData";

describe("sortData", () => {
  it("sắp xếp số đúng và giữ thứ tự khi bằng nhau ở cả hai chiều", () => {
    const data = [
      { id: "A", value: 10 },
      { id: "B", value: 2 },
      { id: "C", value: 10 },
      { id: "D", value: 30 },
    ];

    expect(
      sortData(data, { key: "value", dir: "asc" }).map(x => x.id),
    ).toEqual(["B", "A", "C", "D"]);

    expect(
      sortData(data, { key: "value", dir: "desc" }).map(x => x.id),
    ).toEqual(["D", "A", "C", "B"]);
  });

  it("sắp xếp chuỗi theo tiếng Việt và giữ thứ tự tên trùng", () => {
    const data = [
      { id: "A", name: "Đạt" },
      { id: "B", name: "Dũng" },
      { id: "C", name: "An" },
      { id: "D", name: "Đạt" },
    ];

    expect(
      sortData(data, { key: "name", dir: "asc" }).map(x => x.id),
    ).toEqual(["C", "B", "A", "D"]);

    expect(
      sortData(data, { key: "name", dir: "desc" }).map(x => x.id),
    ).toEqual(["A", "D", "B", "C"]);
  });

  it("đặt giá trị không hỗ trợ cuối và giữ thứ tự của chúng", () => {
    const data: { id: string; value: unknown }[] = [
      { id: "null", value: null },
      { id: "two", value: 2 },
      { id: "undefined", value: undefined },
      { id: "nan", value: NaN },
      { id: "infinity", value: Infinity },
      { id: "boolean", value: true },
      { id: "object", value: {} },
      { id: "one", value: 1 },
    ];

    const unsupported = [
      "null", "undefined", "nan", "infinity", "boolean", "object",
    ];

    expect(
      sortData(data, { key: "value", dir: "asc" }).map(x => x.id),
    ).toEqual(["one", "two", ...unsupported]);

    expect(
      sortData(data, { key: "value", dir: "desc" }).map(x => x.id),
    ).toEqual(["two", "one", ...unsupported]);
  });

  it("xử lý cột trộn số và chuỗi theo chính sách đã chọn", () => {
    const data = [
      { value: "b" },
      { value: 2 },
      { value: "a" },
      { value: 1 },
    ];

    expect(
      sortData(data, { key: "value", dir: "asc" }).map(x => x.value),
    ).toEqual([1, 2, "a", "b"]);

    expect(
      sortData(data, { key: "value", dir: "desc" }).map(x => x.value),
    ).toEqual(["b", "a", 2, 1]);
  });

  it("sortState null trả mảng mới, giữ thứ tự và tham chiếu", () => {
    const data = [{ value: 2 }, { value: 1 }];
    const result = sortData(data, null);

    expect(result).not.toBe(data);
    expect(result).toEqual(data);
    result.forEach((item, index) => {
      expect(item).toBe(data[index]);
    });
  });

  it("xử lý mảng rỗng và vẫn trả mảng mới", () => {
    const data: { value: number }[] = [];

    for (const state of [
      null,
      { key: "value", dir: "asc" },
    ] as const) {
      const result = sortData(data, state);
      expect(result).toEqual([]);
      expect(result).not.toBe(data);
    }
  });

  it("không sửa mảng, object hoặc sortState đầu vào", () => {
    const data = [
      Object.freeze({ id: "A", value: 2 }),
      Object.freeze({ id: "B", value: 1 }),
    ];
    Object.freeze(data);

    const state = Object.freeze({
      key: "value" as const,
      dir: "asc" as const,
    });

    const result = sortData(data, state);

    expect(data).toEqual([
      { id: "A", value: 2 },
      { id: "B", value: 1 },
    ]);
    expect(result).not.toBe(data);
    expect(result[0]).toBe(data[1]);
    expect(result[1]).toBe(data[0]);
    expect(state).toEqual({ key: "value", dir: "asc" });
  });
});