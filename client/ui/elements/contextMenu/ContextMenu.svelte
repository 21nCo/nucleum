<script lang="ts">
  import type {
    IContextMenuGroup,
    IContextMenuItem
  } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import { bg, cn } from "@21n/ui/environment/presentation";
  import Divider from "@21n/ui/elements/Divider.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import ContextMenuItem from "@21n/ui/elements/contextMenu/ContextMenuItem.svelte";
  import ContextMenuOptionGroup from "@21n/ui/elements/contextMenu/ContextMenuOptionGroup.svelte";
  import { ColorStrength } from "@21n/theme/appearance.type";
  import view from "@21n/ui/environment/view.store";
  let {
    menuResolver,
    size = Size.md,
    heading = undefined,
    onSelect = () => {},
    parentBgIndex = 1,
    isFullWidth = $view.isConstrainedWidth,
    bottomRender = undefined,
    onClose = undefined
  }: {
    menuResolver: () => IContextMenuGroup[];
    size?: Size.sm | Size.md | Size.lg | Size.xl;
    heading?: string | undefined;
    onSelect?: (item: IContextMenuItem) => void;
    parentBgIndex?: number;
    isFullWidth?: boolean;
    bottomRender?: string | undefined;
    onClose?: (() => void) | undefined;
  } = $props();
  let menuRef = $state<HTMLDivElement>();
  const menu = $derived<IContextMenuGroup[]>(
    menuResolver ? menuResolver() : []
  );

  function resolveItemSize() {
    return size === Size.xl ? Size.lg : size;
  }

  function resolveMenuButtons() {
    if (!menuRef) return [];
    return Array.from(
      menuRef.querySelectorAll<HTMLButtonElement>("button.contextmenuitem")
    ).filter((button) => !button.disabled);
  }

  /**
   * Moves focus through the menu items with Up and Down while the menu is
   * shown, and closes it on Escape. Enter and Space activate the focused item.
   */
  function onWindowKeydown(event: KeyboardEvent) {
    if (!menuRef || menuRef.getClientRects().length === 0) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    if (event.altKey) return;
    if (event.key === "Escape" && onClose) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = resolveMenuButtons();
    if (buttons.length === 0) return;
    const step = event.key === "ArrowDown" ? 1 : -1;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      index < 0
        ? step === 1
          ? 0
          : buttons.length - 1
        : (index + step + buttons.length) % buttons.length;
    event.preventDefault();
    event.stopPropagation();
    buttons[next].focus();
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div
  bind:this={menuRef}
  class={cn(
    "flex flex-col gap-1 p-1 rounded-md",
    {
      [bg(parentBgIndex)]: !$view.isConstrainedWidth,
      "w-full": isFullWidth,
      "border border-brs2": !isFullWidth,
      "text-b3": size === Size.sm,
      "text-b2": size === Size.md || size === Size.lg || size === Size.xl
    },
    !isFullWidth && {
      "w-48": size === Size.sm,
      "w-56": size === Size.md,
      "w-64": size === Size.lg,
      "w-72": size === Size.xl
    }
  )}
>
  {#if heading}
    <span
      class={cn("w-full px-2 text-left", {
        "px-1.5": size === Size.sm,
        "px-2": size === Size.md,
        "px-3": size === Size.lg
      })}
    >
      <Text content={heading} style={TextStyle.SECTION_HEADING_SMALL} />
    </span>
  {/if}
  {#each menu as group, index}
    <div
      class={cn("flex", {
        "flex-col": !group.isToggleGroup,
        "flex-row justify-around p-2 gap-2": group.isToggleGroup
      })}
    >
      {#if group.option}
        <ContextMenuOptionGroup
          option={group.option}
          size={resolveItemSize()}
        />
      {:else}
        {#each group.items as item}
          <ContextMenuItem
            {item}
            size={resolveItemSize()}
            isToggleGroup={group.isToggleGroup}
            {parentBgIndex}
            onSelect={() => onSelect(item)}
          />
        {/each}
      {/if}
    </div>
    {#if index !== menu.length - 1}
      <Divider colorStrength={ColorStrength.Strong} />
    {/if}
  {/each}
  {#if bottomRender}
    {@html bottomRender}
  {/if}
</div>
