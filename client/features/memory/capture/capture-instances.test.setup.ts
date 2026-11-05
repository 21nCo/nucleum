import { AccessMode } from "@nucleum/datafn/resource.type";
import {
  registerCaptureInstance,
  type CaptureSaveSource
} from "./capture-instances";

const mounted: (() => void)[] = [];
let nextKey = 0;

/**
 * Registers a mounted Capture in `layer` for a test and returns the source a
 * save from it carries. `unmountCaptures` removes every Capture it mounted.
 */
export function mountCapture(
  layer: AccessMode | undefined,
  options: { element?: HTMLElement; isVisible?: boolean } = {}
): CaptureSaveSource {
  const key = `capture-${++nextKey}`;
  mounted.push(
    registerCaptureInstance({
      key,
      layer: () => layer,
      element: () => options.element,
      isVisible: () => options.isVisible ?? true
    })
  );
  return { instance: key, layer };
}

/** Unregisters every Capture `mountCapture` registered. */
export function unmountCaptures() {
  mounted.splice(0).forEach((unmount) => unmount());
}
