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
import { resolveOpenLiveActionAccessMode } from "@nucleum/shared-state/commands/live-action-access";

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

  if (params.shouldReturnToLinkedCollection && params.linkedCollectionId) {
    navigation.openResource(params.linkedCollectionId, AccessMode.PAGE, {
      searchParams: {
        [AccessMode.OVERLAY]: null
      }
    });
    return;
  }

  if (params.shouldOpenUponSave) {
    navigation.openResource(params.node.id, AccessMode.PAGE, {
      searchParams: {
        [AccessMode.OVERLAY]: null
      }
    });
  }
}

/**
 * Closes the capture surface after completion in the layer it is open in, so
 * a capture opened in the panel closes and an unrelated overlay stays open.
 */
export function closeCaptureAfterSave(shouldOpenUponSave: boolean) {
  if (shouldOpenUponSave) {
    return;
  }
  const url = new URL(window.location.href);
  [
    resourceAction(Resource.node, ResourceActionType.CREATE),
    MemotronAction.CAPTURE_DND,
    MemotronAction.CAPTURE_SECONDARY
  ].forEach((id) => {
    const accessMode = resolveOpenLiveActionAccessMode(id, url);
    if (accessMode) navigation.closeResource({ id, accessMode });
  });
}
