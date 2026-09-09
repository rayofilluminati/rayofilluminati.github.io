// Find the largest fitting prefix without measuring the entire remaining book.
export function pageEnd(start: number, total: number, fits: (end: number) => boolean) {
  let low = start;
  let high = Math.min(total, start + 256);
  while (fits(high)) {
    low = high;
    if (high === total) return total;
    high = Math.min(total, start + (high - start) * 2);
  }
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (fits(middle)) low = middle; else high = middle;
  }
  return Math.max(start + 1, low);
}
