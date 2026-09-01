<svelte:options runes={true} />

<script lang="ts">
  import { hoverable } from "@21n/actions/hover.action";
  import { popover } from "@21n/actions/popover.action";
  import ButtonTooltip from "@21n/elements/button/ButtonTooltip.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  import { Action } from "@21n/types/action.enum";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import type { IAction } from "@21n/types/action.type";
  import { appStore } from "@21n/stores/app.store";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { keyboardShortcuts } from "@21n/components/shortcuts/shortcuts.store";

  let {
    action,
    isLastItem = false,
    isFirstItem = false,
    label = undefined,
    icon = undefined,
    tooltip = undefined,
    ariaLabel = undefined,
    isPreventDefault = false,
    onClick
  }: {
    action: Action | string;
    isLastItem?: boolean;
    isFirstItem?: boolean;
    label?: string;
    icon?: string;
    tooltip?: string;
    ariaLabel?: string;
    isPreventDefault?: boolean;
    onClick?: (event: MouseEvent) => void;
  } = $props();
  let isHovered = $state(false);
  let data = $state<IAction | null>(null);

  let isActive = $derived(
    action === $page.url.searchParams.get(AccessMode.RIGHT) ||
      action === $page.url.searchParams.get(AccessMode.MAIN)
  );

  onMount(() => {
    data = appStore.resolveAction(action);
  });

  function handleClick(event: MouseEvent) {
    if (isPreventDefault) {
      onClick?.(event);
      return;
    }
    appStore.runAction(action);
  }
</script>

{#if data}
  {@const hasTooltip = data.label || tooltip || label}
  {@const accessibleLabel = ariaLabel ?? (tooltip ?? label ?? data.label)}
  {@const shortcut = keyboardShortcuts.resolveShortcutForAction(action)}
  <button
    aria-label={accessibleLabel}
    class={cn(
      "flex items-center justify-center gap-1 h-full px-3.5 transition-colors",
      {
        "hover:border-brs3 hover:bg-bgs3-striped hover:text-fgs3 text-fgs2":
          !isActive,
        "bg-aps3 text-aps1 border-aps2": isActive,
        "border-l": isLastItem,
        "border-x": !isLastItem && !isFirstItem,
        "border-r": isFirstItem
      },
      !isActive && {
        "border-brs3": action === Action.RHOMBUS,
        "border-transparent": action !== Action.RHOMBUS
      }
    )}
    use:hoverable={{
      onHover: (val) => {
        queueMicrotask(() => {
          isHovered = val;
        });
      }
    }}
    use:popover={{
      content: hasTooltip ? ButtonTooltip : "",
      triggerMethod: hasTooltip ? [PopoverTriggerMethod.HOVER] : [],
      placement: Placement.BottomCenter,
      offsetInPx: 5,
      isSecondary: true,
      id: `topnav-menu-tooltip-popover-${data.icon || "default"}`,
      componentProps: hasTooltip
        ? {
            tooltip: tooltip ?? label ?? data.label,
            shortcut,
            parentBgIndex: 2,
            size: Size.sm
          }
        : {}
    }}
    onclick={handleClick}
  >
    <Icon
      icon={icon ?? data.icon}
      isFilled={isHovered}
      class={cn({ "text-fgs3": isHovered && !isActive, "text-aps1": isActive })}
      size={label ? Size.sm : Size.md}
    />
    {#if label}
      <span class="text-b3"> {label} </span>
    {/if}
  </button>
{/if}
