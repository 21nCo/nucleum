<svelte:options runes={true} />

<script lang="ts">
  import { page } from "$app/stores";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { popover } from "@21n/ui/actions/popover.action";
  import { cn } from "@21n/ui/environment/presentation";
  import {
    createPinnedSpacesStore,
    orderPinnedSpaces,
    toPinnedSpacesKey,
    type PinnedSpace
  } from "@nucleum/shell/navigation/pinned-spaces";
  import { LayoutContext } from "@nucleum/shell/layout-mode.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { appMenuStore } from "@nucleum/shell/navigation/app-menu.store";
  import {
    SPACE_PAGE_ACTION,
    decodeSpaceSegment,
    resolveSpacePath
  } from "@nucleum/client/config/space-route";

  let {
    layoutContext
  }: {
    layoutContext: LayoutContext;
  } = $props();

  const pinnedIds = $derived(appMenuStore.pinnedSpaces($appMenuStore));
  const pinnedKey = $derived(toPinnedSpacesKey(pinnedIds));
  const spacesStore = $derived(createPinnedSpacesStore(pinnedKey));
  const spaces = $derived(orderPinnedSpaces(pinnedIds, $spacesStore.data));
  const activeSpaceId = $derived.by(() => {
    const segments = $page.url.pathname.split("/").filter(Boolean);
    return segments[0] === SPACE_PAGE_ACTION && segments[1]
      ? decodeSpaceSegment(segments[1])
      : undefined;
  });
  const isHideMenuLabels = $derived.by(() => {
    $uiState;
    return Boolean(
      uiState.getState(UIState.hideLeftNavMenuLabels, {
        scope: UIStateScope.DAP
      })
    );
  });
  const isShowLabel = $derived(
    layoutContext === LayoutContext.DEFAULT ||
      (layoutContext === LayoutContext.THIN_WITH_LABEL && !isHideMenuLabels)
  );

  function open(space: PinnedSpace) {
    navigation.gotoPath(resolveSpacePath(space.id));
  }

  function resolvePopover(space: PinnedSpace) {
    return {
      placement: Placement.BottomCenter,
      content: ContextMenu,
      triggerMethod: [PopoverTriggerMethod.RIGHT_CLICK],
      componentProps: {
        menuResolver: () => [
          {
            group: "all",
            items: [
              {
                label: "Unpin from App menu",
                value: "unpin",
                icon: "minus-circle",
                callback: async () => appMenuStore.unpinSpace(space.id)
              }
            ]
          }
        ]
      },
      id: `pinned-space-menu-${space.id}`,
      groupId: "resourceSwitcherContextMenuGroup"
    };
  }
</script>

{#if spaces.length > 0}
  <ul
    class={cn("flex flex-col", {
      "gap-2 items-center": layoutContext === LayoutContext.THIN_WITH_LABEL,
      "gap-1": layoutContext !== LayoutContext.THIN_WITH_LABEL
    })}
    aria-label="Pinned spaces"
    data-testid="app-menu-pinned-spaces"
  >
    {#each spaces as space (space.id)}
      {@const isActive = activeSpaceId === space.id}
      {@const label = space.label || "Untitled space"}
      <li class="w-full min-w-0">
        <button
          type="button"
          class={cn(
            "flex items-center w-full min-w-0 cursor-pointer",
            layoutContext === LayoutContext.DEFAULT && {
              "gap-2 rounded-lg p-2 h-9": true,
              "bg-bgs3 text-fgs1": isActive,
              "hover:bg-bgs3-striped text-fgs2": !isActive
            },
            layoutContext === LayoutContext.THIN_WITH_LABEL && {
              "px-2 py-1": !isShowLabel,
              "bg-aps3 border-y border-aps2 text-aps1":
                isActive && !isShowLabel,
              "border-y border-transparent hover:bg-bgs3-striped hover:border-brs3":
                !isActive && !isShowLabel,
              "app-rounded:justify-center app-rounded:border-transparent app-rounded:bg-transparent app-rounded:hover:border-transparent app-rounded:hover:bg-transparent":
                !isShowLabel
            },
            layoutContext !== LayoutContext.DEFAULT &&
              layoutContext !== LayoutContext.THIN_WITH_LABEL && {
                "justify-center px-2 py-1 rounded-lg": true,
                "bg-bgs3": isActive
              }
          )}
          aria-current={isActive ? "page" : undefined}
          aria-label={label}
          title={label}
          data-testid="app-menu-pinned-space"
          onclick={(event) => {
            event.stopPropagation();
            open(space);
          }}
          use:popover={resolvePopover(space)}
        >
          <div
            class={cn("flex gap-1 min-w-0", {
              "flex-col items-center w-full py-2 rounded-md":
                layoutContext === LayoutContext.THIN_WITH_LABEL,
              "border hover:bg-bgs3-striped hover:border-brs3":
                layoutContext === LayoutContext.THIN_WITH_LABEL &&
                isShowLabel &&
                !isActive,
              "border border-transparent":
                layoutContext === LayoutContext.THIN_WITH_LABEL && !isActive,
              "border bg-bgs3 border-brs3":
                layoutContext === LayoutContext.THIN_WITH_LABEL &&
                isActive &&
                isShowLabel,
              "app-rounded:rounded-2xl":
                layoutContext === LayoutContext.THIN_WITH_LABEL,
              "app-rounded:w-10 app-rounded:h-10 app-rounded:py-0 app-rounded:justify-center app-rounded:rounded-full app-rounded:hover:bg-bgs3":
                layoutContext === LayoutContext.THIN_WITH_LABEL && !isShowLabel,
              "app-rounded:bg-aps3":
                layoutContext === LayoutContext.THIN_WITH_LABEL &&
                !isShowLabel &&
                isActive,
              "items-center": layoutContext === LayoutContext.DEFAULT
            })}
          >
            <span class="flex w-6 h-6 shrink-0 items-center justify-center">
              {#if space.avatar}
                <AvatarRenderer avatar={space.avatar} size={Size.md} />
              {:else}
                <Icon
                  icon="combination"
                  isFilled={isActive}
                  size={layoutContext === LayoutContext.DEFAULT
                    ? Size.sm
                    : Size.lg}
                  class={cn({
                    "fill-aps1 stroke-aps1": isActive,
                    "stroke-fgs2": !isActive
                  })}
                />
              {/if}
            </span>
            {#if isShowLabel}
              <span
                class={cn("truncate", {
                  "block max-w-[10rem] text-b2":
                    layoutContext === LayoutContext.DEFAULT,
                  "block w-[4.5rem] text-b4 text-center":
                    layoutContext === LayoutContext.THIN_WITH_LABEL,
                  "text-aps1":
                    layoutContext === LayoutContext.THIN_WITH_LABEL && isActive,
                  "text-fgs2":
                    layoutContext === LayoutContext.THIN_WITH_LABEL && !isActive
                })}
              >
                {label}
              </span>
            {/if}
          </div>
        </button>
      </li>
    {/each}
  </ul>
{/if}
