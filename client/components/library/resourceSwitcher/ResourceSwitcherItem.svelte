<script lang="ts">
  import { Placement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { properCase } from "@21n/shared-utils/text.utils";
  import type { IResourceSwitchItem } from "@21n/types/select.type";
  import { cn } from "@21n/utils/ui.utils";
  import Icon from "@21n/elements/Icon.svelte";
  import AvatarRenderer from "@21n/elements/avatarPicker/AvatarRenderer.svelte";
  import { appStore } from "@21n/stores/app.store";
  import {
    resourceAction,
    resourceCacheKey
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "@21n/components/flux/resourceStores/resource.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { appMenuStore } from "@21n/stores/appMenu/appMenu.store";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { hoverable } from "@21n/actions/hover.action";
  import { popover } from "@21n/actions/popover.action";
  import ContextMenu from "@21n/elements/contextMenu/ContextMenu.svelte";
  import Badge from "@21n/elements/text/Badge.svelte";
  import view from "@21n/stores/view.store";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { isHideCreateAction } from "@21n/components/library/library.utils";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";

  export let item: IResourceSwitchItem;
  export let isActive: boolean = false;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;
  let isHovering: boolean = false;
  let count: number = 0;
  let popRef: HTMLButtonElement;
  const resource = item.value as Resource;
  const cacheKey = resourceCacheKey(resource, CacheKey.COUNT);
  $: isConstrainedWidth = $view.isConstrainedWidth;

  refreshCount();

  function refreshCount() {
    if (!isShowCount) return;
    count = cache.retrieve(cacheKey) || 0;
  }

  function resolveContextMenu() {
    const isCurrentResourcePinned =
      $appMenuStore[$appStore.product]?.user?.includes(resource);
    if (resource === Resource.combination) {
      return [];
    }
    const pinAction = {
      label: isCurrentResourcePinned
        ? "Unpin from App menu"
        : "Pin to App menu",
      value: "pin",
      icon: isCurrentResourcePinned ? "minus-circle" : "pin",
      callback: async () => {
        if (!isCurrentResourcePinned) appMenuStore.addUserMenuItem(resource);
        else appMenuStore.removeUserMenuItem(resource);
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
    "relative flex-1 flex gap-1 items-center whitespace-nowrap border rounded-md text-b2 transition-all",
    {
      "px-4 py-3": isConstrainedWidth,
      "px-3 py-2": !isConstrainedWidth,
      "border border-aps1 bg-aps3": isActive,
      "opacity-80 cursor-not-allowed": item.isDisabled
    },
    !isActive && {
      "outline-transparent ": true,
      "text-fgs2 bg-bgs1 border-brs2": !isConstrainedWidth,
      "text-fgs1 bg-bgs2 border-brs3": isConstrainedWidth,
      "notouch:hover:bg-bgs3-striped active:bg-bgs3-striped focus:bg-bgs3-striped hover:text-fgs1":
        !item.isDisabled
    }
  )}
  on:click
>
  <div
    class={cn("flex flex-col items-start", {
      "text-aps1": isActive,
      "gap-2": !isConstrainedWidth,
      "gap-3": isConstrainedWidth
    })}
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        size={isConstrainedWidth ? Size.lg : Size.md}
        isFilled={isActive}
        class={cn({
          "fill-aps1": isActive,
          "stroke-fgs2":
            (!isConstrainedWidth && !isActive && !isHovering) ||
            item.isDisabled,
          "stroke-fgs1":
            (!isActive && isHovering && !item.isDisabled) || isConstrainedWidth
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
        class={cn({
          "text-h4": isConstrainedWidth,
          "text-aps1": isActive,
          "text-fgs3": !isActive
        })}
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
  subscribeToCacheUpdate={[cacheKey]}
  on:change={() => {
    refreshCount();
  }}
/>
