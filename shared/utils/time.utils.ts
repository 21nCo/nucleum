/**
 * Resolves the unix timestamp of a date in milliseconds
 * This is uniform with Surreal time::millis()
 * @returns current timestamp in unix
 */
export function resolveUnixTimestamp(date?: string | Date) {
  if (!date) return +new Date().getTime();
  return +new Date(date).getTime();
}
