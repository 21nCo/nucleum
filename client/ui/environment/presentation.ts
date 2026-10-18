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

/**
 * bg - background utility function
 * @param parentBackgroundIndex
 * @param isActive
 * @returns
 */
export function bg(
  parentBackgroundIndex: number = 1,
  isActive: boolean = false
) {
  const index = Math.floor(parentBackgroundIndex);
  const resultIndex = isActive ? index + 2 : index + 1;
  const cls = `bg-bgs${resultIndex}`;
  if (parentBackgroundIndex % 1 === 0 || resultIndex > 1) {
    return cls;
  } else {
    return cls + "/" + Math.round((parentBackgroundIndex % 1) * 100);
  }
}

/**
 * Active background utility function
 */
export function abg(isActive: boolean = true, parentBgIndex: number = 0) {
  return isActive ? "bg-aps1 text-abg" : bg(parentBgIndex);
}
