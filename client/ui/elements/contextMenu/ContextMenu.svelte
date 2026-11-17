<script lang="ts" module>
  import { isTextElement } from "@21n/ui/actions/interaction-dom";

  /** Menus shown now, in the order they opened. */
  const openMenus: HTMLElement[] = [];

  /** Controls that use the arrow keys themselves. */
  const arrowControlSelector = [
    "select",
    "audio[controls]",
    "video[controls]",
    "[role='radiogroup']",
    "[role='radio']",
    "[role='listbox']",
    "[role='slider']",
    "[role='spinbutton']",
    "[role='combobox']",
    "[role='tree']",
    "[role='grid']",
    "[role='tablist']"
  ].join(", ");

  /** Shown, and not inside an inert or hidden layer such as a covered page. */
  function isReachableMenu(menu: HTMLElement) {
    return (
      menu.isConnected &&
      menu.getClientRects().length > 0 &&
      !menu.closest("[inert], [aria-hidden='true']")
    );
  }

  /**
   * The menu that owns a key: the menu the target sits in, else the most
   * recently opened reachable menu. A target in a secondary popover, such as
   * an option submenu, is not in a menu, so it counts as the latter.
   */
  function resolveKeyOwner(target: EventTarget | null) {
    const container =
      target instanceof Element
        ? openMenus.find((menu) => menu.contains(target))
        : undefined;
    if (container) return container;
    for (let index = openMenus.length - 1; index >= 0; index--) {
      if (isReachableMenu(openMenus[index])) return openMenus[index];
    }
    return undefined;
  }

  function isArrowControl(target: EventTarget | null) {
    if (isTextElement(target)) return true;
    return target instanceof Element && !!target.closest(arrowControlSelector);
  }
</script>

<script lang="ts">
  import type { IContextMenuGroup, IContextMenuItem } from "@21n/ui/elements/contextMenu/context-menu.type";
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
    onClose = undefined,
    closePopover = undefined
  }: {
    menuResolver: () => IContextMenuGroup[];
    size?: Size.sm | Size.md | Size.lg | Size.xl;
    heading?: string | undefined;
    onSelect?: (item: IContextMenuItem) => void;
    parentBgIndex?: number;
    isFullWidth?: boolean;
    bottomRender?: string | undefined;
    onClose?: (() => void) | undefined;
    /** Passed by the popover action that mounts the menu. */
    closePopover?: (() => void) | undefined;
  } = $props();
  let menuRef = $state<HTMLDivElement>();
  $effect(() => {
    const node = menuRef;
    if (!node) return;
    openMenus.push(node);
    window.addEventListener("keydown", onWindowKeydown, true);
    return () => {
      window.removeEventListener("keydown", onWindowKeydown, true);
      const index = openMenus.indexOf(node);
      if (index >= 0) openMenus.splice(index, 1);
    };
  });
  const menu = $derived<IContextMenuGroup[]>(menuResolver ? menuResolver() : []);

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
   * It listens on the window in the capture phase, so the keys reach the menu
   * before a drawer that keeps its keys inside or closes on Escape. Only the
   * front menu takes them: the menu holding the focus, else the most recently
   * opened reachable one. Arrows from a control that uses them, such as an
   * option group's radios or a text field, stay with that control.
   */
  function onWindowKeydown(event: KeyboardEvent) {
    if (!menuRef || !isReachableMenu(menuRef)) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    if (event.altKey) return;
    const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";
    if (event.key !== "Escape" && !isArrow) return;
    if (resolveKeyOwner(event.target) !== menuRef) return;
    if (event.key === "Escape") {
      const close = onClose ?? closePopover;
      if (!close) return;
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (isArrowControl(event.target)) return;
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
        <ContextMenuOptionGroup option={group.option} size={resolveItemSize()} />
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
