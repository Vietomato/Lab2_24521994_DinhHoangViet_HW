import { describe, expect, it } from "vitest";
import { paginate } from "./paginate";

const data = [
  { id: "A" },
  { id: "B" },
  { id: "C" },
  { id: "D" },
  { id: "E" },
];

describe("paginate", () => {
  it("lấy đúng trang đầu, giữa và cuối chưa đủ size", () => {
    expect(paginate(data, 0, 2)).toEqual({
      items: [data[0], data[1]],
      page: 0,
      pageCount: 3,
    });

    expect(paginate(data, 1, 2)).toEqual({
      items: [data[2], data[3]],
      page: 1,
      pageCount: 3,
    });

    expect(paginate(data, 2, 2)).toEqual({
      items: [data[4]],
      page: 2,
      pageCount: 3,
    });
  });

  it("clamp trang âm và trang vượt giới hạn", () => {
    expect(paginate(data, -10, 2).page).toBe(0);
    expect(paginate(data, 99, 2)).toEqual(
      paginate(data, 2, 2),
    );
  });

  it("bỏ phần thập phân và chuẩn hóa trang không hữu hạn", () => {
    expect(paginate(data, 1.9, 2).page).toBe(1);

    for (const page of [NaN, Infinity, -Infinity]) {
      expect(paginate(data, page, 2).page).toBe(0);
    }
  });

  it("xử lý data rỗng và tạo mảng items mới", () => {
    const empty: { id: string }[] = [];
    const result = paginate(empty, 99, 2);

    expect(result).toEqual({
      items: [],
      page: 0,
      pageCount: 0,
    });
    expect(result.items).not.toBe(empty);
  });

  it("xử lý size lớn hơn data và chia hết không dư trang", () => {
    const result = paginate(data, 99, 10);

    expect(result).toEqual({
      items: data,
      page: 0,
      pageCount: 1,
    });
    expect(result.items).not.toBe(data);

    expect(paginate(data.slice(0, 4), 0, 2).pageCount).toBe(2);
  });

  it.each([0, -1, 1.5, NaN, Infinity, -Infinity])(
    "từ chối size không hợp lệ: %s",
    size => {
      expect(() => paginate(data, 0, size)).toThrow(RangeError);
      expect(() => paginate([], 0, size)).toThrow(RangeError);
    },
  );

  it("không mutation; giữ dòng có giá trị trùng và tham chiếu", () => {
    const input = [
      Object.freeze({ id: "A", value: 2 }),
      Object.freeze({ id: "B", value: 2 }),
      Object.freeze({ id: "C", value: 1 }),
    ];
    const before = input.map(item => ({ ...item }));
    Object.freeze(input);

    const result = paginate(input, 0, 2);

    expect(input).toEqual(before);
    expect(result.items).not.toBe(input);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toBe(input[0]);
    expect(result.items[1]).toBe(input[1]);
  });
});