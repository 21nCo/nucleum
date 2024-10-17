<script lang="ts">
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { resolveCollectionContextMenu } from "../../collection/collection.store";
  import { resolveNodeContextMenu } from "../../node/node.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";

  const dispatch = createEventDispatcher();
  export let item: any;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: IRecordId | undefined = undefined;
  function onAction(e: CustomEvent<string>) {
    if (e.detail === "star") item.isStarred = !item.isStarred;
    dispatch("action", { action: e.detail, id: item.id });
  }
  function resolveContextMenu(item: any, accessPoint: ResourceAccessPoint) {
    const resourceType = determineResourceType(item.id);
    if (resourceType === Resource.node) {
      return resolveNodeContextMenu(item, accessPoint, {
        accessPointId
      });
    } else if (resourceType === Resource.collection) {
      return resolveCollectionContextMenu(item, accessPoint);
    } else {
      return [];
    }
  }
</script>

<ContextMenuAction
  id="resourceThumbnailContextMenu"
  menuResolver={() => resolveContextMenu(item, accessPoint)}
  size={Size.lg}
  on:action={onAction}
/>
