import { navigation } from "@nucleum/shell/navigation/navigation";
import { Resource } from "@nucleum/datafn/resource.enum";
import { resourceAction } from "@nucleum/datafn/resource.utils";
import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
import {
  toasts,
  inlineToasts
} from "@nucleum/shared-state/notifications/notification.store";
import { AccessMode } from "@nucleum/datafn/resource.type";
import type { IRecordId } from "@nucleum/schema/legacy/data.type";
import { MemotronAction } from "@nucleum/features/memory/memory-action.enum";
import { isValidString } from "@21n/shared-utils/text.utils";
import type { IEvent } from "@21n/ui/elements/input/event.type";
import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
import { getContext } from "svelte";
import { Context } from "@nucleum/shared-state/app-context/app-store.type";

/** Resolves the collection selected by capture links. */
export function resolveLinkedCollectionId(captureState: {
  isCaptureFromCollectionPage?: boolean;
  linkQueryParam?: string | null;
}) {
  const linkQueryParam = captureState.linkQueryParam;
  if (
    !captureState.isCaptureFromCollectionPage ||
    typeof linkQueryParam !== "string" ||
    !isValidString(linkQueryParam) ||
    !linkQueryParam.startsWith(`${Resource.collection}:`)
  ) {
    return undefined;
  }
  return linkQueryParam as IRecordId;
}

/** Opens a newly captured node according to capture options. */
export function handleSingleNodePostSave(params: {
  node: { id: IRecordId };
  isEmbedContext?: boolean;
  isConstrainedWidth: boolean;
  shouldOpenUponSave: boolean;
  linkedCollectionId?: IRecordId;
  shouldReturnToLinkedCollection: boolean;
  /** Layer the saving Capture is rendered in; only that surface closes. */
  layer: AccessMode | undefined;
}) {
  if (!params.isConstrainedWidth && !params.isEmbedContext) {
    toasts.success("Node saved successfully!");
  }

  if (!params.isEmbedContext && !params.shouldOpenUponSave) {
    inlineToasts.success({
      id: "nodecapture",
      message: "Node saved successfully",
      data: params.node
    });
  }

  if (params.isEmbedContext) {
    return;
  }

  const surface = resolveCaptureSurface(
    new URL(window.location.href),
    params.layer
  );
  const searchParams =
    surface && surface.accessMode !== AccessMode.PAGE
      ? { [surface.accessMode]: null }
      : {};

  if (params.shouldReturnToLinkedCollection && params.linkedCollectionId) {
    navigation.openResource(params.linkedCollectionId, AccessMode.PAGE, {
      searchParams
    });
    return;
  }

  if (params.shouldOpenUponSave) {
    navigation.openResource(params.node.id, AccessMode.PAGE, {
      searchParams
    });
  }
}

const captureActions: string[] = [
  resourceAction(Resource.node, ResourceActionType.CREATE),
  MemotronAction.CAPTURE_DND,
  MemotronAction.CAPTURE_SECONDARY
];

/**
 * The capture surface open in `url` that a Capture rendered in `layer` is,
 * with the layer it is open in, or undefined when that layer shows no
 * capture. Other Captures open in other layers are never included.
 */
export function resolveCaptureSurface(url: URL, layer: AccessMode | undefined) {
  const id = layer ? url.searchParams.get(layer) : null;
  return layer && id && captureActions.includes(id)
    ? { id, accessMode: layer }
    : undefined;
}

/**
 * Closes the saved Capture's own surface, given the layer it is rendered in,
 * so a Capture page saved while a Capture in the panel holds a draft leaves
 * the panel open. Skipped when opening the saved node already replaced the
 * capture.
 */
export function closeCaptureAfterSave(
  isReplacedByOpenedNode: boolean,
  layer: AccessMode | undefined
) {
  if (isReplacedByOpenedNode) {
    return;
  }
  const surface = resolveCaptureSurface(new URL(window.location.href), layer);
  if (surface) navigation.closeResource(surface);
}

/**
 * Closes the page after a capture is cleared or saved on a constrained width
 * when that capture is the page, given the layer it is rendered in, as a phone
 * page capture does. A capture in the overlay or the right panel stays open,
 * and a page under it is kept, even when that page is another capture. A page
 * that already shows something else, such as the node a save opened, stays.
 */
export function closeCapturePageAfterReset(layer: AccessMode | undefined) {
  const page = new URL(window.location.href).searchParams.get(AccessMode.PAGE);
  if (layer !== AccessMode.PAGE || !page || !captureActions.includes(page)) {
    return;
  }
  navigation.closeResource({ accessMode: AccessMode.PAGE });
}

/**
 * Whether an app event saves the capture: Cmd/Ctrl+Enter while the capture is
 * visible. A capture hidden under another layer, such as a right panel or base
 * page under a full-screen overlay or a page under the navigator, ignores it,
 * so it never saves a draft the user cannot see.
 */
export function isCaptureSaveShortcut(event: IEvent, isVisible: boolean) {
  return (
    isVisible &&
    event.event === GlobalEvent.ENTER &&
    event.value?.metaKey === true
  );
}

/**
 * Reads, when a save starts, the layer of the Capture around the calling
 * component, which a save passes on so that only that Capture's surface
 * closes. Undefined outside a Capture.
 */
export function resolveCaptureLayerReader(): () => AccessMode | undefined {
  const capture = getContext<{ layer?: AccessMode } | undefined>(
    Context.CAPTURE
  );
  return () => capture?.layer;
}
