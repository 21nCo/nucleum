<svelte:options runes={true} />

<script lang="ts">
  import { topBarDropdown } from "@nucleum/shell/topNav/top-bar-dropdown";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { hoverable } from "@21n/ui/actions/hover.action";
  import { popover } from "@21n/ui/actions/popover.action";
  import ButtonTooltip from "@21n/ui/elements/button/ButtonTooltip.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { cn } from "@21n/ui/environment/presentation";
  import { Size } from "@21n/ui/elements/size.enum";
  import { Action } from "@nucleum/client/config/action.enum";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import type { Snippet } from "svelte";

  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { keyboardShortcuts } from "@nucleum/shared-state/shortcuts/shortcuts.store";
  import context from "@nucleum/client/runtime/context.store";
  import {
    isLiveActionAccessConfigurable,
    resolveLiveActionAccessMode,
    saveLiveActionAccessMode
  } from "@nucleum/shared-state/commands/live-action-access";

  let {
    action,
    isLastItem = false,
    isFirstItem = false,
    label = undefined,
    icon = undefined,
    tooltip = undefined,
    ariaLabel = undefined,
    isPreventDefault = false,
    isExpanded = false,
    trailing = undefined,
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
    /** Fills the width it is given, as the open action of the panel group. */
    isExpanded?: boolean;
    /** Content shown after the label, such as a running timer. */
    trailing?: Snippet;
    onClick?: (event: MouseEvent) => void;
  } = $props();
  let isHovered = $state(false);
  let isOpeningMenuOpen = $state(false);
  let openingMode = $state<AccessMode | undefined>(undefined);
  const openingOptions = [
    { mode: AccessMode.OVERLAY, label: "Open as overlay" },
    { mode: AccessMode.PANEL, label: "Open in right panel" }
  ];
  let data = $state<IAction | null>(null);
  let currentSearchParams = $state(new URLSearchParams(window.location.search));

  let isActive = $derived(
    action === currentSearchParams.get(AccessMode.PANEL) ||
      action === currentSearchParams.get(AccessMode.OVERLAY)
  );

  onMount(() => {
    data = requireCommandHost().resolveAction(action);
    const unsubscribe = page.subscribe((p) => {
      currentSearchParams = p?.url?.searchParams ?? new URLSearchParams();
    });

    return () => unsubscribe?.();
  });

  function handleContextMenu(event: MouseEvent) {
    if (!data || !isLiveActionAccessConfigurable(data)) return;
    event.preventDefault();
    openingMode = resolveLiveActionAccessMode(data);
    isOpeningMenuOpen = true;
  }

  function selectOpeningMode(mode: AccessMode) {
    saveLiveActionAccessMode(action, mode);
    openingMode = mode;
    isOpeningMenuOpen = false;
  }

  function handleClick(event: MouseEvent) {
    if (isPreventDefault) {
      onClick?.(event);
      return;
    }
    requireCommandHost().runAction(action);
  }
</script>

{#if data}
  {@const hasTooltip = data.label || tooltip || label}
  {@const accessibleLabel = ariaLabel ?? tooltip ?? label ?? data.label}
  {@const shortcut = keyboardShortcuts.resolveShortcutForAction(action)}
  <div
    class={cn("relative h-full", { "flex-1 min-w-0": isExpanded })}
    use:topBarDropdown={{
      isOpen: isOpeningMenuOpen,
      onDismiss: () => (isOpeningMenuOpen = false)
    }}
  >
    <button
      aria-label={accessibleLabel}
      aria-pressed={isExpanded ? true : undefined}
      class={cn(
        "flex items-center gap-1 h-full px-3.5 transition-colors",
        {
          "justify-center": !isExpanded,
          "w-full justify-start gap-2 px-4 text-fgs1 hover:bg-bgs3": isExpanded,
          "hover:border-brs3 hover:bg-bgs3-striped hover:text-fgs3 text-fgs2":
            !isActive,
          "bg-aps3 text-aps1 border-aps2": isActive && !isExpanded,
          "border-l": isLastItem && !$context.experiments?.isEnableRoundedMain,
          "border-x": !isLastItem && !isFirstItem,
          "border-r": isFirstItem && !$context.experiments?.isEnableRoundedMain
        },
        !isActive && "border-transparent"
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
      oncontextmenu={handleContextMenu}
    >
      <Icon
        icon={icon ?? data.icon}
        isFilled={isHovered}
        class={cn({
          "text-fgs3": isHovered && !isActive,
          "text-aps1": isActive
        })}
        size={label ? Size.sm : Size.md}
      />
      {#if label}
        <span class="text-b3"> {label} </span>
      {/if}
      {#if trailing}
        <span class="flex items-center ml-auto">{@render trailing()}</span>
      {/if}
    </button>
    {#if isOpeningMenuOpen}
      <div
        role="menu"
        aria-label={`${accessibleLabel} opening`}
        data-testid="quick-action-opening-menu"
        class="absolute right-0 top-full mt-1 z-[60] w-52 flex flex-col p-1 rounded-md border border-brs3 bg-bgs1 shadow-lg"
      >
        {#each openingOptions as option (option.mode)}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={openingMode === option.mode}
            class={cn(
              "flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-b2 text-left hover:bg-bgs2",
              { "text-aps1": openingMode === option.mode }
            )}
            onclick={() => selectOpeningMode(option.mode)}
          >
            {option.label}
            {#if openingMode === option.mode}
              <Icon icon="check" size={Size.sm} />
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
