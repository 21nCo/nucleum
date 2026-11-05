import { getContext } from "svelte";
import { AccessMode } from "@nucleum/datafn/resource.type";
import { Context } from "@nucleum/shared-state/app-context/app-store.type";

/**
 * The mounted Capture a save started from: its instance key and the layer it
 * is rendered in. Completion closes that layer only while the same instance
 * is still mounted there.
 */
export type CaptureSaveSource = {
  instance: string;
  layer: AccessMode | undefined;
};

/** A mounted Capture, as the shortcut routing and save completion see it. */
export type CaptureInstance = {
  key: string;
  layer: () => AccessMode | undefined;
  element: () => HTMLElement | undefined;
  isVisible: () => boolean;
};

const instances = new Map<string, CaptureInstance>();

/**
 * Layers from the top of the stack down, in the order the shell resolves its
 * top layer. Covered layers are left out through each instance's visibility.
 */
const layerOrder: (AccessMode | undefined)[] = [
  AccessMode.OVERLAY,
  AccessMode.PANEL,
  AccessMode.BESIDE_PAGE,
  AccessMode.PAGE,
  AccessMode.BESIDE_BASE,
  undefined
];

/** Registers a mounted Capture; returns its unregister function. */
export function registerCaptureInstance(instance: CaptureInstance) {
  instances.set(instance.key, instance);
  return () => {
    if (instances.get(instance.key) === instance)
      instances.delete(instance.key);
  };
}

/** Whether the Capture a save started from is still mounted in its layer. */
export function isCaptureSourceMounted(source: CaptureSaveSource | undefined) {
  const instance = source ? instances.get(source.instance) : undefined;
  return !!instance && instance.layer() === source?.layer;
}

/**
 * The one Capture a broadcast shortcut such as Cmd+Enter acts on: the visible
 * Capture containing `activeElement`, otherwise the visible Capture in the
 * topmost layer, the most recently mounted one on a tie.
 */
export function resolveShortcutCaptureInstance(
  activeElement: Element | null
): string | undefined {
  const visible = [...instances.values()].filter((item) => item.isVisible());
  const focused = activeElement
    ? visible.find((item) => item.element()?.contains(activeElement))
    : undefined;
  if (focused) return focused.key;
  const rank = (item: CaptureInstance) => {
    const index = layerOrder.indexOf(item.layer());
    return index === -1 ? layerOrder.length : index;
  };
  return visible.reduce<CaptureInstance | undefined>(
    (top, item) => (!top || rank(item) <= rank(top) ? item : top),
    undefined
  )?.key;
}

/**
 * Reads, when a save starts, the source of the Capture around the calling
 * component, which a save passes on so that only that Capture's surface
 * closes. Undefined outside a Capture.
 */
export function resolveCaptureSourceReader(): () =>
  CaptureSaveSource | undefined {
  const capture = getContext<{ source?: CaptureSaveSource } | undefined>(
    Context.CAPTURE
  );
  return () => capture?.source;
}
