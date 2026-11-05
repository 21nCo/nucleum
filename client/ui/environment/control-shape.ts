import { derived } from "svelte/store";
import {
  AppStyle,
  isFramedAppStyle,
  resolveAppStyle
} from "@21n/theme/app-style";
import { elementAppearance } from "@21n/ui/environment/element-environment.store";

/**
 * How portable controls are shaped for an app style. Boxed controls fill
 * their cell edge to edge; framed styles render free-standing controls with
 * a medium radius (semi-rounded) or as pills and circles (rounded).
 */
export type ControlShape = {
  isFramed: boolean;
  isRounded: boolean;
  radiusClass: "rounded-md" | "rounded-full";
};

/** Resolves the control shape of an app style. */
export function resolveControlShape(style: unknown): ControlShape {
  const appStyle = resolveAppStyle(style);
  const isRounded = appStyle === AppStyle.Rounded;
  return {
    isFramed: isFramedAppStyle(appStyle),
    isRounded,
    radiusClass: isRounded ? "rounded-full" : "rounded-md"
  };
}

/**
 * Whether a control asked to render as an edge-to-edge cell keeps that shape;
 * only the boxed style draws cells.
 */
export function isBoxedCell(isBoxed: boolean, shape: ControlShape) {
  return isBoxed && !shape.isFramed;
}

/** Control shape of the app style supplied through the element appearance. */
export const elementControlShape = derived(elementAppearance, (value) =>
  resolveControlShape(value.appStyle)
);
