import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and lets a later Tailwind class beat an earlier one, so a
// component's own classes can be overridden by whoever uses it.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
