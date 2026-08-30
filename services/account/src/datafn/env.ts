/** Reads a positive integer environment value, returning undefined when invalid. */
export function readPositiveIntegerEnv(name: string): number | undefined {
  return readIntegerEnv(name, 1);
}

/** Reads a non-negative integer environment value, returning undefined when invalid. */
export function readNonNegativeIntegerEnv(name: string): number | undefined {
  return readIntegerEnv(name, 0);
}

function readIntegerEnv(name: string, minimum: number): number | undefined {
  const value = process.env[name]?.trim();
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    return undefined;
  }
  return parsed;
}
