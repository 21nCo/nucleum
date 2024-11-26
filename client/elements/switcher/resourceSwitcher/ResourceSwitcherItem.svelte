<script lang="ts">
  import { Orientation, Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { properCase } from "$lib/shared/utils/text.utils";
  import type { IResourceSwitchItem } from "$lib/client/types/select.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { appMenuStore } from "$lib/client/stores/appMenu/appMenu.store";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { popover } from "$lib/client/actions/popover.action";
  import ContextMenu from "../../contextMenu/ContextMenu.svelte";
  import view from "$lib/client/stores/view.store";
  import Badge from "../../text/Badge.svelte";
  import { onMount } from "svelte";
  import { SearchStore } from "$lib/client/products/memotron/memotron.store";
  import { MemotronAction } from "$lib/client/products/memotron/memotronAction.enum";
  export let item: IResourceSwitchItem;
  export let size: Size.lg | Size.md | Size.sm = Size.md;
  export let isActive: boolean = false;
  export let iconOrientation: Orientation = Orientation.Horizontal;
  export let parentBgIndex: number = 1;
  export let isShowCount: boolean = false;
  let isHovering: boolean = false;
  let count: number = 0;
  let popRef: HTMLButtonElement;

  onMount(async () => {
    await refresh();
  });

  export async function refresh() {
    await refreshCount();
  }

  async function refreshCount() {
    if (!isShowCount) return;
    count = await new SearchStore().resolveCount(item.value as Resource);
  }

  function resolveContextMenu() {
    const isCurrentResourcePinned = $appMenuStore[
      $appStore.product
    ]?.user?.includes(
      resourceAction(item.value as Resource, ResourceActionType.BROWSE)
    );
    if (item.value === Resource.combination) {
      return [];
    }
    return [
      {
        group: "all",
        items: [
          {
            label: isCurrentResourcePinned
              ? "Unpin from App menu"
              : "Pin to App menu",
            value: "pin",
            icon: isCurrentResourcePinned ? "unpin" : "pin",
            callback: async () => {
              if (!isCurrentResourcePinned)
                appMenuStore.addUserMenuItem(
                  resourceAction(
                    item.value as Resource,
                    ResourceActionType.BROWSE
                  )
                );
              else
                appMenuStore.removeUserMenuItem(
                  resourceAction(
                    item.value as Resource,
                    ResourceActionType.BROWSE
                  )
                );
              popRef.dispatchEvent(new CustomEvent("hide"));
            }
          },
          {
            label: "Create new",
            value: "create",
            icon: "plus",
            callback: async () => {
              if (item.value === Resource.node) {
                appStore.runAction(MemotronAction.CAPTURE);
              } else {
                appStore.runAction(
                  resourceAction(
                    item.value as Resource,
                    ResourceActionType.CREATE
                  )
                );
              }
              popRef.dispatchEvent(new CustomEvent("hide"));
            }
          }
        ]
      }
      // {
      //   group: "more",
      //   items: [
      //     {
      //       label: "Show archived",
      //       value: "archived",
      //       icon: "archive",
      //       callback: async () => {}
      //     }
      //   ]
      // }
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
    "relative flex gap-1 justify-center items-center whitespace-nowrap border  hover:text-fgs1",
    {
      "px-8 py-6": iconOrientation === Orientation.Vertical && size === Size.lg,
      "px-6 py-4": iconOrientation === Orientation.Vertical && size === Size.md,
      "px-3 py-1": iconOrientation === Orientation.Vertical && size === Size.sm,
      "rounded-md": size != Size.sm,
      "text-b2 rounded-full": size === Size.sm,
      "border border-aps1 bg-aps3 hover:bg--aps2": isActive,
      "outline-transparent border-brs3 text-fgs3 hover:bg-bgs2": !isActive,
      "opacity-80 cursor-not-allowed": item.isDisabled,
      "px-4 py-1":
        iconOrientation === Orientation.Horizontal && $view.isConstrainedWidth
    },
    !$view.isConstrainedWidth &&
      iconOrientation === Orientation.Horizontal && {
        "min-w-56 h-20": size === Size.lg,
        "min-w-48 h-14": size === Size.md,
        "min-w-40 h-10": size === Size.sm
      }
  )}
  on:click
>
  <div
    class={cn("flex", {
      "flex-col gap-1": iconOrientation === Orientation.Vertical,
      "gap-2": iconOrientation === Orientation.Horizontal,
      "portrait:text-base portrait:font-medium": size === Size.md,
      "text-b2": size === Size.sm,
      "text-base": size === Size.lg,
      "text-aps1": isActive
    })}
  >
    {#if item.icon && typeof item.icon === "string"}
      <Icon
        icon={item.icon}
        class={cn({
          "fill-aps1": isActive,
          "stroke-fgs3": !isActive && !isHovering,
          "stroke-fgs1": !isActive && isHovering
        })}
        {size}
      />
    {:else if item.icon && typeof item.icon === "object"}
      <AvatarRenderer avatar={item.icon} {size} />
    {/if}
    <span>
      {properCase(item.label ?? item.value.toString())}
    </span>
  </div>
  {#if isHovering && !item.isHidePinAction}
    <div
      class={cn("absolute right-0 top-0 p-1", {
        "flex h-full items-center": size == Size.sm
      })}
    >
      <Icon icon={item.isPinned ? "unpin" : "pin"} size={Size.lg} />
    </div>
  {/if}
  {#if isShowCount && count > 0}
    <span class="text-fgs3">
      <Badge
        text={count}
        {size}
        parentBgIndex={isHovering ? parentBgIndex : parentBgIndex - 1}
        isAccentColor={isActive}
      />
    </span>
  {/if}
</button>
