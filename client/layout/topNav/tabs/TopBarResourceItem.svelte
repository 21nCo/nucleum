<script lang="ts">
  import { page } from "$app/stores";
  import { hoverable } from "@21n/actions/hover.action";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import ContextMenu from "@21n/elements/contextMenu/ContextMenu.svelte";
  import { resolveResource } from "@21n/components/record/record.store";
  import { appStore } from "@21n/stores/app.store";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import type { IRecordId } from "@21n/types/data.type";
  import { Placement } from "@21n/types/direction.enum";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { abg, cn } from "@21n/utils/ui.utils";
  import { onMount } from "svelte";
  import { tabs } from "@21n/layout/topNav/tabs/tabs.store";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { rearrangeOnAxis } from "@21n/actions/rearrange.action";
  import { createEventDispatcher } from "svelte";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import context from "@21n/stores/context.store";
  const dispatch = createEventDispatcher();
  export let item: IRecordId;
  export let isInterimTab: boolean = false;
  let resource: any;
  let action: any;
  let isHovering: boolean = false;
  let resourceType: Resource = Resource.unknown;
  const dev_isFullHeightTabStyle = true;
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

<div
  class={cn("border--x border--r-brs3 border-l-transparent max-h-full", {
    "h-full": !isInterimTab && dev_isFullHeightTabStyle,
    "p-1": !dev_isFullHeightTabStyle || isInterimTab
  })}
>
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
      "relative flex items-center text-b2 gap-2 max-w-48 min-w-20 truncate",
      // abg(isActive, 1),
      {
        "rounded-md": !dev_isFullHeightTabStyle || isInterimTab,
        "px-4 py-1.5": !isInterimTab,
        "px-2 py-0.5 border border-dashed border-fgs4": isInterimTab,
        "hover:bg-bgs3 text-fgs2 hover:text-fgs1": !isActive,
        "bg-bgs1": isActive
      },
      !isInterimTab &&
        dev_isFullHeightTabStyle && {
          "h-full border-b": true,
          "border-transparent": !isActive,
          "border-aps1": isActive
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
            const backParam = $page.url.searchParams.get(AppSearchParam.BACK);
            tabs.open(item, backParam ?? undefined);
          }}
        />
        <Button
          icon="cross"
          tooltip="Close"
          size={Size.sm}
          parentBgIndex={2}
          on:click={() => {
            dispatch("close");
          }}
        />
      </div>
    {/if}
    {#if !isInterimTab && (isHovering || $context.isTouchDevice)}
      <button
        class={cn(
          "absolute right-0 h-full rounded-r-md bg-gradient-to-l  to-transparent pl-10",
          {
            "from-bgs3 via-bgs3": !isActive && !$context.isTouchDevice,
            "from-bgs2 via-bgs2": !isActive && $context.isTouchDevice,
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
          <Icon icon="cross" size={Size.sm} class="stroke-fgs2" />
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
