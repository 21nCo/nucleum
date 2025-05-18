<script lang="ts">
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import type { IResourceSwitchItem } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { appMenuStore } from "$lib/client/stores/appMenu/appMenu.store";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { popover } from "$lib/client/actions/popover.action";
  import ContextMenu from "$lib/client/elements/contextMenu/ContextMenu.svelte";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { onMount } from "svelte";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import view from "$lib/client/stores/view.store";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { isHideCreateAction } from "../library.utils";

  export let item: IResourceSwitchItem;
  export let isActive: boolean = false;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;
  let isHovering: boolean = false;
  let count: number = 0;
  let popRef: HTMLButtonElement;
  const resource = item.value as Resource;

  onMount(async () => {
    await refresh();
  });

  export async function refresh() {
    await refreshCount();
  }

  async function refreshCount() {
    if (!isShowCount) return;
    count = await new SearchStore().resolveCount(resource);
  }

  function resolveContextMenu() {
    const isCurrentResourcePinned = $appMenuStore[
      $appStore.product
    ]?.user?.includes(resourceAction(resource, ResourceActionType.BROWSE));
    if (resource === Resource.combination) {
      return [];
    }
    const pinAction = {
      label: isCurrentResourcePinned
        ? "Unpin from App menu"
        : "Pin to App menu",
      value: "pin",
      icon: isCurrentResourcePinned
        ? "ph:minus-circle-light"
        : "ph:push-pin-light",
      callback: async () => {
        if (!isCurrentResourcePinned)
          appMenuStore.addUserMenuItem(
            resourceAction(resource, ResourceActionType.BROWSE)
          );
        else
          appMenuStore.removeUserMenuItem(
            resourceAction(resource, ResourceActionType.BROWSE)
          );
        popRef.dispatchEvent(new CustomEvent("hide"));
      }
    };
    const createAction = {
      label: "Create new",
      value: "create",
      icon: "plus",
      callback: async () => {
        appStore.runAction(resourceAction(resource, ResourceActionType.CREATE));
        popRef.dispatchEvent(new CustomEvent("hide"));
      }
    };
    if (isHideCreateAction(resource)) {
      return [
        {
          group: "all",
          items: [pinAction]
        }
      ];
    }
    return [
      {
        group: "all",
        items: [pinAction, createAction]
      }
    ];
  }
</script>

<button
  bind:this={popRef}
  use:hoverable={{
    onHover: (e) => (isHovering = e)
  }}
  use:popover={{
    placement: Placement.BottomCenter,
    content: ContextMenu,
    triggerMethod: [PopoverTriggerMethod.RIGHT_CLICK],
    componentProps: { menuResolver: resolveContextMenu },
    id: "resourceSwitcherContextMenu",
    groupId: "resourceSwitcherContextMenuGroup"
  }}
  class={cn(
    "relative flex-1 flex gap-1 items-center whitespace-nowrap border px-4 py-3 rounded-md text-b2",
    {
      "border border-aps1 bg-aps3 hover:bg--aps2": isActive,
      "opacity-80 cursor-not-allowed": item.isDisabled
    },
    !isActive && {
      "outline-transparent bg-bgs2 border-brs3": true,
      "text-fgs2": !$view.isConstrainedWidth,
      "text-fgs1": $view.isConstrainedWidth,
      "notouch:hover:bg-bgs3 active:bg-bgs3 focus:bg-bgs3 hover:text-fgs1":
        !item.isDisabled
    }
  )}
  on:click
>
  <div
    class={cn("flex flex-col items-start gap-3", {
      "text-aps1": isActive
    })}
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        size={Size.lg}
        class={cn({
          "fill-aps1": isActive,
          "stroke-fgs2":
            (!$view.isConstrainedWidth && !isActive && !isHovering) ||
            item.isDisabled,
          "stroke-fgs1":
            (!isActive && isHovering && !item.isDisabled) ||
            $view.isConstrainedWidth
        })}
      />
    {:else if item.icon && typeof item.icon === "object"}
      <AvatarRenderer avatar={item.icon} size={Size.lg} />
    {/if}
    <span>
      {properCase(item.label ?? item.value.toString())}
    </span>
  </div>
  <!-- {#if isHovering && !item.isHidePinAction}
    <div class={cn("absolute right-0 top-0 p-1", {})}>
      <Icon icon={item.isPinned ? "unpin" : "pin"} size={Size.lg} />
    </div>
  {/if} -->
  {#if isShowCount && count > 0}
    <span class="absolute right-0 top-0 m-3 leading-none">
      <span
        class={cn("text-h4", { "text-aps1": isActive, "text-fgs3": !isActive })}
      >
        {count}
      </span>
      <!-- <Badge
        text={count}
        size={Size.sm}
        parentBgIndex={isHovering ? parentBgIndex : parentBgIndex - 1}
        isAccentColor={isActive}
      /> -->
    </span>
  {/if}
  {#if item.badge}
    <span class="absolute right-0 top-0 m-2">
      <Badge
        text={item.badge}
        size={Size.sm}
        parentBgIndex={isHovering ? parentBgIndex : parentBgIndex - 1}
        isAccentColor={isActive}
      />
    </span>
  {/if}
</button>

<ComponentBaseLayer
  subscribeToResource={new Set([resource])}
  subscribeToContext={new Set([
    ResourceAccessPoint.LIBRARY,
    resourceAction(resource, ResourceActionType.CREATE)
  ])}
  subScriptionPropsForMergeAction={[]}
  on:syncDown={() => {
    refresh();
  }}
  on:change={() => {
    refresh();
  }}
/>
