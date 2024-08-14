<script lang="ts">
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { resolveResource } from "$lib/client/products/memotron/memotron.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { abg, cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  export let item: string;
  let resource: any;
  let isHovering: boolean = false;
  let contextMenu = [
    {
      group: "all",
      items: [
        {
          value: "remove",
          icon: "cross",
          callback: () => uiState.removeResourceFromTopBar(item)
        }
      ]
    }
  ];
  $: isActive =
    item === $page.url.searchParams.get(ResourceAccessMode.TOPBARFOCUS);
  onMount(async () => {
    resource = await resolveResource(item);
  });
</script>

<ContextMenuAction {contextMenu}>
  <HoverableElement
    type="button"
    bind:isHovering
    class={cn(
      "relative flex items-center rounded-full border border-brs3 text-b2 gap-2 px-6 py-1 hover:border-aps1",
      abg(isActive, 1)
    )}
    on:click
    on:contextmenu
  >
    <div class="min-w-fit">
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
