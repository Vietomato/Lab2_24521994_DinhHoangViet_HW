export function paginate<T>(
  data: T[],
  page: number,
  size: number,
): {
  items: T[];
  page: number;
  pageCount: number;
} {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError("size phải là số nguyên dương.");
  }

  const pageCount = Math.ceil(data.length / size);

  const requestedPage = Number.isFinite(page)
    ? Math.trunc(page)
    : 0;

  const lastPage = Math.max(0, pageCount - 1);

  const clampedPage = Math.min(
    Math.max(requestedPage, 0),
    lastPage,
  );

  const start = clampedPage * size;

  return {
    items: data.slice(start, start + size),
    page: clampedPage,
    pageCount,
  };
}