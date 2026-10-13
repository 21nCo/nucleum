/**
 * @deprecated - use lib/shared/crypto.utils instead
 * @returns
 */
export function generateUID() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}
