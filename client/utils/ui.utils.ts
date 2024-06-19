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
  return isActive
    ? `bg-bgs${parentBackgroundIndex + 2}`
    : `bg-bgs${parentBackgroundIndex + 1}`;
}
/**
 * Active background utility function
 */
export function abg(isActive: boolean = true, parentBgIndex: number = 0) {
  return isActive ? "bg-aps1 text-abg" : bg(parentBgIndex);
}
/**
 * A utility function to create an empty transition to be used for conditional transitions
 * @returns
 */
export function emptyTranstition() {
  return {
    duration: 1,
    css: () => `transition: none;`
  };
}
