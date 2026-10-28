import { describe, expect, it } from "vitest";
import { moveFocus } from "./moveFocus";

describe("moveFocus", () => {
  it("di chuyển một ô theo bốn phím mũi tên", () => {
    const focus = { row: 1, col: 1 };

    expect(moveFocus(focus, "ArrowUp", 3, 4)).toEqual({
      row: 0, col: 1,
    });
    expect(moveFocus(focus, "ArrowDown", 3, 4)).toEqual({
      row: 2, col: 1,
    });
    expect(moveFocus(focus, "ArrowLeft", 3, 4)).toEqual({
      row: 1, col: 0,
    });
    expect(moveFocus(focus, "ArrowRight", 3, 4)).toEqual({
      row: 1, col: 2,
    });
  });

  it("clamp tại bốn biên, không di chuyển vòng", () => {
    expect(moveFocus({ row: 0, col: 0 }, "ArrowUp", 3, 4))
      .toEqual({ row: 0, col: 0 });
    expect(moveFocus({ row: 0, col: 0 }, "ArrowLeft", 3, 4))
      .toEqual({ row: 0, col: 0 });
    expect(moveFocus({ row: 2, col: 3 }, "ArrowDown", 3, 4))
      .toEqual({ row: 2, col: 3 });
    expect(moveFocus({ row: 2, col: 3 }, "ArrowRight", 3, 4))
      .toEqual({ row: 2, col: 3 });
  });

  it("key khác giữ vị trí hợp lệ và vẫn trả object mới", () => {
    const focus = { row: 1, col: 2 };

    for (const key of ["Enter", " ", "a", ""]) {
      const result = moveFocus(focus, key, 3, 4);
      expect(result).toEqual(focus);
      expect(result).not.toBe(focus);
    }
  });

  it("clamp focus đầu vào trước khi di chuyển", () => {
    const focus = { row: 99, col: -5 };

    expect(moveFocus(focus, "Enter", 3, 4))
      .toEqual({ row: 2, col: 0 });
    expect(moveFocus(focus, "ArrowUp", 3, 4))
      .toEqual({ row: 1, col: 0 });
  });

  it("chuẩn hóa chỉ số thập phân và không hữu hạn", () => {
    expect(moveFocus({ row: 1.9, col: 2.8 }, "Enter", 3, 4))
      .toEqual({ row: 1, col: 2 });

    for (const value of [NaN, Infinity, -Infinity]) {
      expect(moveFocus({ row: value, col: value }, "Enter", 3, 4))
        .toEqual({ row: 0, col: 0 });
    }
  });

  it("trả vị trí quy ước khi không có ô", () => {
    expect(moveFocus({ row: 1, col: 1 }, "ArrowRight", 0, 4))
      .toEqual({ row: 0, col: 0 });
    expect(moveFocus({ row: 1, col: 1 }, "ArrowDown", 3, 0))
      .toEqual({ row: 0, col: 0 });
    expect(moveFocus({ row: 1, col: 1 }, "Enter", 0, 0))
      .toEqual({ row: 0, col: 0 });
  });

  it("lưới một ô giữ nguyên vị trí với mọi phím mũi tên", () => {
    for (const key of [
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    ]) {
      expect(moveFocus({ row: 0, col: 0 }, key, 1, 1))
        .toEqual({ row: 0, col: 0 });
    }
  });

  it.each([-1, 1.5, NaN, Infinity, -Infinity])(
    "từ chối kích thước không hợp lệ: %s",
    value => {
      const focus = { row: 0, col: 0 };

      expect(() => moveFocus(focus, "Enter", value, 4))
        .toThrow(RangeError);
      expect(() => moveFocus(focus, "Enter", 3, value))
        .toThrow(RangeError);
      expect(() => moveFocus(focus, "Enter", 0, value))
        .toThrow(RangeError);
    },
  );

  it("không sửa object focus đầu vào", () => {
    const focus = Object.freeze({ row: 1, col: 1 });
    const result = moveFocus(focus, "ArrowRight", 3, 4);

    expect(focus).toEqual({ row: 1, col: 1 });
    expect(result).toEqual({ row: 1, col: 2 });
    expect(result).not.toBe(focus);
  });
});