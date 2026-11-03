<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import {
    isFullScreenPage,
    navigation
  } from "@nucleum/shell/navigation/navigation";
  import { tabState } from "@nucleum/shell/topNav/tabs/tab-state";
  import { liveResource } from "@nucleum/shell/topNav/tabs/live-resource";
  import ResourceLabel from "@nucleum/shell/topNav/tabs/ResourceLabel.svelte";

  import { page } from "$app/stores";
  import { hoverable } from "@21n/ui/actions/hover.action";
  import { popover, tooltip } from "@21n/ui/actions/popover.action";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import {
    determineResourceAccessMode,
    isTrashedResource
  } from "@nucleum/datafn/resource.utils";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";

  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { abg, cn } from "@21n/ui/environment/presentation";
  import { tabs } from "@nucleum/shell/topNav/tabs/tabs.store";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { rearrangeOnAxis } from "@21n/ui/actions/rearrange.action";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import context from "@nucleum/client/runtime/context.store";
  let {
    item,
    isInterimTab = false,
    isTrail = false,
    isTypeIcon = false,
    trailing = undefined,
    onClick,
    onClose,
    onRearrange,
    onRearranged
  }: {
    item: IRecordId;
    isInterimTab?: boolean;
    isTrail?: boolean;
    /** Labels the item with its type icon and plain label, as in the navigator. */
    isTypeIcon?: boolean;
    /** Content at the right end of the row, such as a visit time. */
    trailing?: Snippet;
    onClick?: (event?: MouseEvent | KeyboardEvent) => void;
    onClose?: () => void;
    onRearrange?: (displacement: number) => void;
    onRearranged?: (displacement: number) => void;
  } = $props();
  const live = $derived(liveResource(item));
  const resource = $derived($live.resource);
  const isResolved = $derived($live.isResolved);
  const isShown = $derived(
    !isResolved ||
      !isTrail ||
      (!!resource && !(resource.id && isTrashedResource(resource)))
  );
  let isHovering = $state(false);
  const dev_isFullHeightTabStyle = true;
  const contextMenu = $derived(
    isTrail
      ? []
      : [
          {
            group: "all",
            items: [
              {
                value: "remove",
                label: "Remove from tabs",
                icon: "cross",
                callback: async () => tabState.removeResourceFromTabs(item)
              }
            ]
          }
        ]
  );
  let isActive = $derived(
    item.toString() === $page.url?.searchParams?.get(AccessMode.PAGE)
  );
  function resolveContextMenu() {
    if (!resource?.id) return contextMenu;
    const currentMode = determineResourceAccessMode(resource.id);
    const maxSearchParam = isFullScreenPage(resource.id);
    return [
      ...contextMenu,
      {
        group: "open",
        items: [
          {
            value: "open-as-split",
            label:
              currentMode === AccessMode.BESIDE_BASE
                ? "Close split screen"
                : "Open in split screen",
            icon:
              currentMode === AccessMode.BESIDE_BASE
                ? "minus-circle"
                : "split-screen",
            callback: async () => {
              if (currentMode === AccessMode.BESIDE_BASE) {
                navigation.closeResource({
                  id: resource.id,
                  accessMode: AccessMode.BESIDE_BASE
                });
              } else {
                navigation.openResource(resource.id, AccessMode.BESIDE_BASE);
              }
            }
          },
          {
            value: "open-in-full-screen",
            label: maxSearchParam ? "Minimize" : "Maximize",
            icon: maxSearchParam ? "exitfullscreen" : "fullscreen",
            callback: async () => {
              navigation.toggleFullScreen(currentMode, resource.id);
            }
          }
        ]
      }
    ];
  }

  function handleRearrange(displacement: number) {
    onRearrange?.(displacement);
  }

  function handleRearranged(displacement: number) {
    onRearranged?.(displacement);
  }

  function handleTabClick(event?: MouseEvent | KeyboardEvent) {
    onClick?.(event);
  }

  function handleTabKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleTabClick(event);
    }
  }
</script>

{#if isShown}
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
        isTrail
          ? "w-full rounded-md px-2 py-1.5 text-fgs2 hover:bg-bgs3 hover:text-fgs1"
          : {
              "rounded-md": !dev_isFullHeightTabStyle || isInterimTab,
              "px-4 py-1.5": !isInterimTab,
              "px-2 py-1 border": isInterimTab,
              "border-transparent hover:border-dashed hover:border-brs3":
                isInterimTab && !isActive,
              "border-dashed border-brs4 bg-bgs3": isActive && isInterimTab,
              "max-w-48 min-w-24": true,
              "hover:bg-bgs3 text-fgs2 hover:text-fgs1": !isActive,
              "bg-bgs1": !isInterimTab && isActive
            },
        !isTrail &&
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
      <div class="truncate text-b3 min-w-0">
        <ResourceLabel source={$live} {isTypeIcon} />
      </div>
      {#if trailing}
        <span class="ml-auto shrink-0 text-b3 text-fgs3"
          >{@render trailing()}</span
        >
      {/if}
      {#if isInterimTab && !isTrail}
        <div class="flex items-center">
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
                navigation.goBack();
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
{/if}
