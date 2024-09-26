<script lang="ts">
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { resolveCollectionContextMenu } from "../../collection/collection.store";
  import { MemotronResourceType } from "../../memotron.type";
  import { resolveResourceType } from "../../memotron.utils";
  import { resolveNodeContextMenu } from "../../node/node.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "$lib/client/types/data.type";

  const dispatch = createEventDispatcher();
  export let item: any;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: IRecordId | undefined = undefined;
  $: contextMenu = resolveContextMenu(item, accessPoint);
  function onAction(e: CustomEvent<string>) {
    if (e.detail === "star") item.isStarred = !item.isStarred;
    dispatch("action", { action: e.detail, id: item.id });
  }
  function resolveContextMenu(item: any, accessPoint: ResourceAccessPoint) {
    const resourceType = resolveResourceType(item);
    if (resourceType === MemotronResourceType.NODE) {
      return resolveNodeContextMenu(item, accessPoint, {
        accessPointId
      });
    } else {
      return resolveCollectionContextMenu(item, accessPoint);
    }
  }
</script>

<ContextMenuAction
  id="resourceThumbnailContextMenu"
  {contextMenu}
  size={Size.lg}
  on:action={onAction}
/>
