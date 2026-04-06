<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import { hoverable } from "@21n/actions/hover.action";
  import { popover, tooltip } from "@21n/actions/popover.action";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import {
    determineResourceType,
    isRecordId
  } from "@21n/components/flux/resourceStores/resource.utils";
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
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import context from "@21n/stores/context.store";
  import { ResourceActions } from "@21n/components/record/resource.actions";
  import { resolveResourceStore } from "@21n/components/flux/resourceStores/store.resolver";
  import { ResourceStore } from "@21n/components/flux/resourceStores/resource.store";
  let {
    item,
    isInterimTab = false,
    isTrail = false,
    onClick,
    onClose,
    onRearrange,
    onRearranged
  }: {
    item: IRecordId;
    isInterimTab?: boolean;
    isTrail?: boolean;
    onClick?: () => void;
    onClose?: () => void;
    onRearrange?: (displacement: number) => void;
    onRearranged?: (displacement: number) => void;
  } = $props();
  let resource = $state<any>(undefined);
  let action = $state<any>(undefined);
  let isHovering = $state(false);
  let resourceType = $state<Resource>(Resource.unknown);
  const dev_isFullHeightTabStyle = true;
  let contextMenu = [
    {
      group: "all",
      items: [
        {
          value: "remove",
          label: "Remove from tabs",
          icon: "cross",
          callback: async () => uiState.removeResourceFromTabs(item)
        }
      ]
    }
  ];
  let isActive = $derived(
    item.toString() === $page.url.searchParams.get(AccessMode.POP)
  );
  onMount(async () => {
    if (isRecordId(item)) {
      resourceType = determineResourceType(item);
      action = appStore.resolveAction(resourceType);
      resource = await resolveResource(item);
    } else {
      action = appStore.resolveAction(item);
      if (action) {
        resource = {
          label: action.label,
          icon: action.icon
        };
      }
    }
  });

  function resolveContextMenu() {
    const resourceStore = resolveResourceStore(resourceType);
    if (
      !resource ||
      !resourceStore ||
      !(resourceStore instanceof ResourceStore)
    )
      return contextMenu;
    const resourceActions = new ResourceActions(resource, resourceStore, {
      accessPoint: ResourceAccessPoint.SELF,
      accessMode: AccessMode.TAB
    });
    return [
      ...contextMenu,
      {
        group: "open",
        items: [resourceActions.openAsSplit(), resourceActions.maximize()]
      }
    ];
  }

  function handleRearrange(displacement: number) {
    onRearrange?.(displacement);
  }

  function handleRearranged(displacement: number) {
    onRearranged?.(displacement);
  }

  function handleTabClick(event?: Event) {
    onClick?.();
    void event;
  }

  function handleTabKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTabClick();
    }
  }
</script>

<div
  class={cn("border--x border--r-brs3 border-l-transparent max-h-full z-10", {
    "h-full": !isInterimTab && dev_isFullHeightTabStyle,
    "p-1": !isTrail && (!dev_isFullHeightTabStyle || isInterimTab)
  })}
>
  <div
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
      "relative z-20 flex items-center text-b2 gap-2 truncate",
      // abg(isActive, 1),
      {
        "rounded-md": !dev_isFullHeightTabStyle || isInterimTab,
        "px-4 py-1.5": !isInterimTab && !isTrail,
        "px-2 py-1 border": isInterimTab,
        "border-transparent hover:border-dashed hover:border-brs3":
          isInterimTab && !isActive,
        "border-dashed border-brs4 bg-bgs3": isActive && isInterimTab,
        "w-full": isTrail,
        "bg-bgs2": isTrail && !isActive,
        "max-w-48 min-w-24": !isTrail,
        "px-1 py-1.5": !isInterimTab && isTrail,
        "hover:bg-bgs3 text-fgs2 hover:text-fgs1": !isActive,
        "bg-bgs1": !isInterimTab && isActive
      },
      !isInterimTab &&
        dev_isFullHeightTabStyle && {
          "h-full border-b": true,
          "border-transparent": !isActive,
          "border-aps1": isActive
        }
    )}
    role="button"
    tabindex="0"
    onclick={handleTabClick}
    onkeydown={handleTabKeyDown}
  >
    <div class="truncate text-b3">
      {#if !resource}
        <span class="w-32"> loading... </span>
      {:else if action?.resourceLabelRenderer && resource}
        {@const ResourceLabelRenderer = action.resourceLabelRenderer}
        <ResourceLabelRenderer
          item={resource}
          accessPoint={ResourceAccessPoint.TABS}
        />
      {:else}
        <span class="flex items-center gap-1">
          {#if resource.icon}
            <Icon icon={resource.icon} size={Size.sm} />
          {/if}
          {isValidString(resource?.label) ? resource?.label : "Untitled"}
        </span>
      {/if}
    </div>
    {#if isInterimTab && !isTrail}
      <div class="flex items-center">
        <Button
          icon="ph:push-pin-light"
          tooltip="Pin to tabs"
          size={Size.sm}
          parentBgIndex={2}
          onclick={() => {
            const backParam = $page.url.searchParams.get(AppSearchParam.BACK);
            tabs.open(item, backParam ?? undefined);
          }}
        />
        <Button
          icon="cross"
          tooltip="Close"
          size={Size.sm}
          parentBgIndex={2}
          onclick={() => {
            onClose?.();
          }}
        />
      </div>
    {/if}
    {#if !isTrail && !isInterimTab && (isHovering || $context.isTouchDevice)}
      <div
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
          type="button"
          onclick={(event) => {
            event.stopPropagation();
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
      </div>
    {/if}
  </div>
</div>

<ComponentBaseLayer
  subscribeToRecords={[item]}
  onChange={(data) => {
    if ("params" in data && data.params?.record) {
      const record = data.params.record;
      resource = { ...resource, ...record };
    }
  }}
/>
