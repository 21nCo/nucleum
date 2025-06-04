<script lang="ts">
  import { page } from "$app/stores";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { popover, tooltip } from "$lib/client/actions/popover.action";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
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
  import ComponentBaseLayer from "../../layers/ComponentBaseLayer.svelte";
  import { rearrangeOnAxis } from "$lib/client/actions/rearrange.action";
  import { createEventDispatcher } from "svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  const dispatch = createEventDispatcher();
  export let item: IRecordId;
  export let isInterimTab: boolean = false;
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

<div class="p-1 border-x border-r-brs3 border-l-transparent">
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
      "relative flex items-center rounded-md text-b2 gap-2 max-w-48 min-w-20 truncate",
      // abg(isActive, 1),
      {
        "px-4 py-1.5": !isInterimTab,
        "px-2 py-0.5 border border-dashed border-fgs4": isInterimTab,
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
        <svelte:component
          this={action.resourceLabelRenderer}
          item={resource}
          accessPoint={ResourceAccessPoint.TABS}
        />
      {:else}
        {isValidString(resource?.label) ? resource?.label : "Untitled"}
      {/if}
    </div>
    {#if isInterimTab}
      <div class="flex items-center">
        <Button
          icon="ph:push-pin-light"
          tooltip="Pin to tabs"
          size={Size.sm}
          parentBgIndex={2}
          on:click={() => {
            tabs.open(item);
          }}
        />
        <Button
          icon="ph:x-light"
          tooltip="Close"
          size={Size.sm}
          parentBgIndex={2}
          on:click={() => {
            dispatch("close");
          }}
        />
      </div>
    {/if}
    {#if isHovering && !isInterimTab}
      <button
        class={cn(
          "absolute right-0 h-full rounded-r-md bg-gradient-to-l  to-transparent pl-10",
          {
            "from-bgs3 via-bgs3": !isActive,
            "from-bgs1 via-bgs1": isActive
          }
        )}
      >
        <button
          on:click={() => {
            tabs.remove(item);
            if (isActive) {
              appStore.goBack();
            }
          }}
          use:tooltip={{
            text: "Close"
          }}
          class="h-full flex justify-center items-center pr-2"
        >
          <Icon icon="ph:x" size={Size.sm} class="stroke-fgs2" />
        </button>
      </button>
    {/if}
  </button>
</div>

<ComponentBaseLayer
  subscribeToRecords={[item]}
  on:change={(e) => {
    const record = e?.detail?.params?.record;
    if (record) {
      resource = { ...resource, ...record };
    }
  }}
/>
