export const textTruncateMapper = (x: string, length: number = 15) =>
  x?.length > length ? x.slice(0, length) + "..." : x;
