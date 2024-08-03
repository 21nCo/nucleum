<script lang="ts">
  import { selectedResources } from "$lib/client/components/resourceStores/resource.store";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import Check from "$lib/client/icons/Check.svelte";
  import CheckCircle from "$lib/client/icons/CheckCircle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resolveCollectionContextMenu } from "../../collection/collection.store";
  import { MemotronResourceType } from "../../memotron.type";
  import { resolveResourceType } from "../../memotron.utils";
  import { resolveNodeContextMenu } from "../../node/node.store";
  let isHovering = false;
  export let item: any;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let isApplyCustomColor: boolean = false;
  $: contextMenu = resolveContextMenu(item, accessPoint);
  $: isSelected = $selectedResources.includes(item.id);
  function resolveContextMenu(item: any, context: ResourceAccessPoint) {
    const resourceType = resolveResourceType(item);
    if (resourceType === MemotronResourceType.NODE) {
      return resolveNodeContextMenu(item, context);
    } else {
      return resolveCollectionContextMenu(item, context);
    }
  }
  function onAction(e: CustomEvent<string>) {
    if (e.detail === "star") item.isStarred = !item.isStarred;
  }
</script>

<!-- TODO - position of right click context menu at cursor instead of bottom of the thumbnail -->
<!-- <ContextMenuAction {contextMenu}> -->
<HoverableElement class="relative flex w-full" bind:isHovering>
  <slot />
  {#if isSelected || $selectedResources.length > 0}
    <button
      class="absolute top-0 left-0 flex gap-2 bg-bgs2 border border-brs3 rounded-full m-3 p-0.5"
      on:click|stopPropagation
    >
      {#if isSelected}
        <Check
          isChecked={true}
          isRounded={true}
          on:click={() => {
            $selectedResources = $selectedResources.filter((x) => x != item.id);
          }}
        />
      {:else if $selectedResources.length > 0}
        <Check
          isChecked={false}
          isRounded={true}
          on:click={() => {
            $selectedResources = [...$selectedResources, item.id];
          }}
        />
      {/if}
    </button>
  {/if}
  {#if isHovering}
    <button
      class={cn(
        "absolute top-0 right-0 flex gap-2 border rounded-md m-3 p--1",
        {
          "bg-ccs4 border-ccs2": isApplyCustomColor,
          "bg-bgs2 border-brs3": !isApplyCustomColor
        }
      )}
      on:click|stopPropagation
    >
      <ContextMenuAction {contextMenu} size={Size.lg} on:action={onAction} />
    </button>
  {/if}
</HoverableElement>
<!-- </ContextMenuAction> -->
