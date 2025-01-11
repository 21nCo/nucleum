<script lang="ts">
  import { page } from "$app/stores";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { popover } from "$lib/client/actions/popover.action";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import { resolveResource } from "$lib/client/components/record/record.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { abg, cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { tabs } from "./tabs.store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import ComponentBaseLayer from "../layers/ComponentBaseLayer.svelte";
  import { rearrangeOnAxis } from "$lib/client/actions/rearrange.action";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let item: IRecordId;
  let resource: any;
  let action: any;
  let isHovering: boolean = false;
  let resourceType: Resource = Resource.unknown;
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
    resourceType = determineResourceType(item);
    action = appStore.resolveAction(resourceType);
    resource = await resolveResource(item);
  });

  function resolveContextMenu() {
    return contextMenu;
  }

  function handleRearrange(displacement: number) {
    dispatch("rearrange", displacement);
  }

  function handleRearranged(displacement: number) {
    dispatch("rearranged", displacement);
  }
</script>

<button
  use:popover={{
    placement: Placement.BottomCenter,
    content: ContextMenu,
    triggerMethod: [PopoverTriggerMethod.RIGHT_CLICK],
    componentProps: { menuResolver: resolveContextMenu },
    id: "topBarContextMenu",
    groupId: "topBarContextMenuGroup"
  }}
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
  use:rearrangeOnAxis={{
    enabled: true,
    onRearrange: handleRearrange,
    onRearranged: handleRearranged,
    threshold: 30
  }}
  class={cn(
    "relative flex items-center rounded--full border-x border-r-brs3 border-l-transparent text-b2 gap-2 px-6 py-2 max-w-48 min-w-20",
    // abg(isActive, 1),
    {
      "hover:bg-bgs3": !isActive,
      "bg-bgs1": isActive
    }
  )}
  on:click
>
  <div class="truncate text-b3">
    {#if !resource}
      <span class="w-32"> loading... </span>
    {:else if action?.resourceLabelRenderer && resource}
      <svelte:component this={action.resourceLabelRenderer} item={resource} />
    {:else}
      {resource?.label ?? "Untitled"}
    {/if}
  </div>
  {#if isHovering}
    <button
      class={cn(
        "absolute right-0 h-full rounded--full bg-gradient-to-l  to-transparent pl-10",
        {
          "from-bgs3 via-bgs3": !isActive,
          "from-bgs1 via-bgs1": isActive
        }
      )}
    >
      <button
        on:click={() => tabs.remove(item)}
        class="h-full flex justify-center items-center pr-2"
      >
        <Icon icon="ph:x" size={Size.sm} class="stroke-fgs2" />
      </button>
    </button>
  {/if}
</button>

<ComponentBaseLayer
  subscribeToResource={new Set([resourceType])}
  subscribeToRecords={[item]}
  on:change={(e) => {
    const record = e?.detail?.params?.record;
    if (record) {
      resource = { ...resource, ...record };
    }
  }}
/>
