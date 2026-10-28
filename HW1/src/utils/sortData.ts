import type { SortState } from "../types/data-grid";

const collator = new Intl.Collator("vi", {
  usage: "sort",
  sensitivity: "variant",
});

function isSupported(value: unknown): value is number | string {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

export function sortData<T>(
  data: readonly T[],
  sortState: SortState<T>,
): T[] {
  if (sortState === null) {
    return [...data];
  }

  const { key, dir } = sortState;
  const direction = dir === "asc" ? 1 : -1;

  // Tạo mảng phụ, ghi nhớ vị trí ban đầu để bảo đảm stable.
  const indexedData = data.map((item, index) => ({
    item,
    index,
  }));

  indexedData.sort((left, right) => {
    const leftValue = left.item[key];
    const rightValue = right.item[key];

    const leftSupported = isSupported(leftValue);
    const rightSupported = isSupported(rightValue);

    // Giá trị không được hỗ trợ luôn nằm cuối.
    if (!leftSupported && !rightSupported) {
      return left.index - right.index;
    }

    if (!leftSupported) {
      return 1;
    }

    if (!rightSupported) {
      return -1;
    }

    let comparison: number;

    if (
      typeof leftValue === "number" &&
      typeof rightValue === "number"
    ) {
      comparison =
        leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
    } else if (
      typeof leftValue === "string" &&
      typeof rightValue === "string"
    ) {
      comparison = collator.compare(leftValue, rightValue);
    } else {
      // Hai giá trị khác kiểu: số đứng trước chuỗi ở chiều asc.
      comparison = typeof leftValue === "number" ? -1 : 1;
    }

    // Không đảo thứ tự ban đầu khi hai giá trị bằng nhau.
    if (comparison === 0) {
      return left.index - right.index;
    }

    return comparison * direction;
  });

  return indexedData.map(({ item }) => item);
}