<script lang="ts">
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { resolveResource } from "$lib/client/products/memotron/memotron.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { abg, cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  export let item: IRecordId;
  let resource: any;
  let isHovering: boolean = false;
  let contextMenu = [
    {
      group: "all",
      items: [
        {
          value: "remove",
          icon: "cross",
          callback: async () => uiState.removeResourceFromTabs(item)
        }
      ]
    }
  ];
  $: isActive =
    item.toString() === $page.url.searchParams.get(ResourceAccessMode.TAB);
  onMount(async () => {
    resource = await resolveResource(item);
  });
</script>

<ContextMenuAction {contextMenu} id="topBarContextMenu">
  <HoverableElement
    type="button"
    bind:isHovering
    class={cn(
      "relative flex items-center rounded--full border-x border-r-brs3 border-l-transparent text-b2 gap-2 px-4 py-2 max-w-48 min-w-20",
      // abg(isActive, 1),
      {
        "hover:bg-aps3 hover:text-aps1 hover:border--aps1": !isActive,
        "bg-bgs1": isActive
      }
    )}
    on:click
    on:contextmenu
  >
    <div class="truncate text-b3">
      {resource?.label}
    </div>
    <!--TODO: Show remove option on right click instead -->
    <!-- {#if isHovering}
    <button
      class={cn(
        "absolute right-0 h-full rounded-full bg-gradient-to-l  to-transparent pr-2 pl-10",
        {
          "from-bgs2 via-bgs2": !isActive,
          "from-aps1 via-aps1": isActive
        }
      )}
    >
      <Button
        icon="cross"
        on:click={() => uiState.removeResourceFromTopBar(item)}
      />
    </button>
  {/if} -->
  </HoverableElement>
</ContextMenuAction>
