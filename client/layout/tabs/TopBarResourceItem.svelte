<script lang="ts">
  import { page } from "$app/stores";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { Placement, popover } from "$lib/client/actions/popover.action";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import { resolveResource } from "$lib/client/products/memotron/memotron.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
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

<button
  use:popover={{
    placement: Placement.BottomCenter,
    content: ContextMenu,
    triggerMethod: PopoverTriggerMethod.RIGHT_CLICK,
    componentProps: { menu: contextMenu },
    id: "topBarContextMenu",
    groupId: "topBarContextMenuGroup"
  }}
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
  class={cn(
    "relative flex items-center rounded--full border-x border-r-brs3 border-l-transparent text-b2 gap-2 px-4 py-2 max-w-48 min-w-20",
    // abg(isActive, 1),
    {
      "hover:bg-aps3 hover:text-aps1 hover:border--aps1": !isActive,
      "bg-bgs1": isActive
    }
  )}
  on:click
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
</button>
