<svelte:options runes={true} />

<script lang="ts">
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import {
    isFullScreenPage,
    navigation
  } from "@nucleum/shell/navigation/navigation";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";
  import { tabState } from "@nucleum/shell/topNav/tabs/tab-state";

  import { page } from "$app/stores";
  import { hoverable } from "@21n/ui/actions/hover.action";
  import { popover, tooltip } from "@21n/ui/actions/popover.action";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@nucleum/datafn/resource.type";
  import {
    determineResourceAccessMode,
    determineResourceType,
    isRecordId,
    isTrashedResource
  } from "@nucleum/datafn/resource.utils";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  import { resolveResource } from "@nucleum/datafn/resource-query.utils";

  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { abg, cn } from "@21n/ui/environment/presentation";
  import { onMount, untrack } from "svelte";
  import { get } from "svelte/store";
  import { tabs } from "@nucleum/shell/topNav/tabs/tabs.store";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { rearrangeOnAxis } from "@21n/ui/actions/rearrange.action";
  import { isValidString } from "@21n/shared-utils/text.utils";
  import Button from "@21n/ui/elements/button/Button.svelte";
  import context from "@nucleum/client/runtime/context.store";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { toSvelteStore } from "@datafn/svelte";
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
    onClick?: (event?: MouseEvent | KeyboardEvent) => void;
    onClose?: () => void;
    onRearrange?: (displacement: number) => void;
    onRearranged?: (displacement: number) => void;
  } = $props();
  let resource = $state<any>(undefined);
  let isResolved = $state(false);
  const isShown = $derived(
    !isResolved ||
      !isTrail ||
      (!!resource && !(resource.id && isTrashedResource(resource)))
  );
  let action = $state<any>(undefined);
  let isHovering = $state(false);
  let resourceType = $state<Resource>(Resource.unknown);
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
  const recordStore = $derived.by(() => {
    if (!isRecordId(item) || resourceType === Resource.unknown)
      return undefined;
    return toSvelteStore<unknown[]>(
      datafn.table(resourceType).signal({
        filters: { id: item },
        limit: 1,
        metadata: {
          includeTrashed: true,
          includeArchived: true
        }
      }),
      { initialData: [] }
    );
  });

  $effect(() => {
    if (!recordStore) return;
    const record = get(recordStore).data[0];
    if (record && typeof record === "object") {
      resource = { ...untrack(() => resource), ...record };
      isResolved = true;
    }
  });

  onMount(() => {
    void initialize();

    async function initialize() {
      if (isRecordId(item)) {
        resourceType = determineResourceType(item);
        action = requireCommandHost().resolveAction(resourceType);
        const resolved = await resolveResource(item).catch((error) => {
          logger.error({ at: "TopBarResourceItem.initialize", item, error });
          return undefined;
        });
        if (resolved) resource = { ...resolved, ...(resource ?? {}) };
      } else {
        action = requireCommandHost().resolveAction(item);
        if (action) {
          resource = {
            label: action.label,
            icon: action.icon
          };
        }
      }
      isResolved = true;
    }
  });

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
        {#if !resource && !isResolved}
          <span
            class="block h-3 w-28 rounded bg-bgs3 animate-pulse"
            aria-hidden="true"
          ></span>
        {:else if action?.resourceLabelRenderer && resource}
          {@const ResourceLabelRenderer = action.resourceLabelRenderer}
          <ResourceLabelRenderer
            item={resource}
            accessPoint={ResourceAccessPoint.TABS}
            isShowFallbackIcons={true}
          />
        {:else}
          <span class="flex items-center gap-1">
            {#if resource?.icon}
              <Icon icon={resource.icon} size={Size.sm} />
            {/if}
            {isValidString(resource?.label) ? resource?.label : "Untitled"}
          </span>
        {/if}
      </div>
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
