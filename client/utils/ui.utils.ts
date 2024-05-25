import type { ClassValue } from "clsx";
import { clsx } from "clsx";

/**
 * Utility function to combine class names
 * @param inputs
 * @returns
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
