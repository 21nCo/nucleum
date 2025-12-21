export function resolveMinWidth(columnCount: number) {
  if (columnCount === 2) return 1000;
  else if (columnCount === 3) return 1200;
  else return 1000;
}
