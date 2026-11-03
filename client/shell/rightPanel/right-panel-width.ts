import { Size } from "@21n/ui/elements/size.enum";

/** Width classes of a right panel tool of the given size. */
export function resolveRightPanelWidthClass(size: Size | undefined) {
  if (size === Size.sm) return "min-w-96 w-96 2k:min-w-128 2k:w-128";
  if (size === Size.lg) return "min-w-[36rem] w-[36rem] 2k:min-w-1/2 2k:w-1/2";
  if (size === Size.xl) return "min-w-1/2 w-1/2 2k:min-w-1/2 2k:w-1/2";
  return "min-w-[32rem] w-[32rem] 2k:min-w-1/2 2k:w-1/2";
}
