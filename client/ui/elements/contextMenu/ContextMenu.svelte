<script lang="ts" module>
  import {
    addPopoverLayer,
    popoverLayers,
    removePopoverLayer,
    type PopoverLayer
  } from "@21n/ui/actions/popover.action";

  /** Menus shown now, each with the popover layer it sits in. */
  const openMenus: { menu: HTMLElement; layer: HTMLElement }[] = [];

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

  const textSelector = [
    "input",
    "textarea",
    "[contenteditable='']",
    "[contenteditable='true']",
    "[contenteditable='plaintext-only']"
  ].join(", ");

  /** An element from any window, such as a same-origin frame's. */
  function isElement(value: unknown): value is Element {
    return (
      !!value && typeof value === "object" && (value as Node).nodeType === 1
    );
  }

  /**
   * The element the key was pressed on. A listener on the window sees a key
   * pressed inside a shadow root as coming from the shadow host, so this reads
   * the composed path instead.
   */
  function resolveKeyTarget(event: KeyboardEvent): Element | null {
    const origin = event.composedPath?.()[0] ?? event.target;
    return isElement(origin) ? origin : null;
  }

  /** The next element out: the parent, or the host of a shadow root. */
  function resolveOuterElement(node: Element): Element | null {
    const root = node.getRootNode() as Document | ShadowRoot;
    return "host" in root && isElement(root.host) ? root.host : null;
  }

  /** Whether the container holds the node, across shadow roots. */
  function containsAcross(container: Element, node: Element) {
    for (let current: Element | null = node; current; ) {
      if (container.contains(current)) return true;
      current = resolveOuterElement(current);
    }
    return false;
  }

  /** Inside an inert or hidden layer, across shadow roots. */
  function isInHiddenLayer(node: Element) {
    for (let current: Element | null = node; current; ) {
      if (current.closest("[inert], [aria-hidden='true']")) return true;
      current = resolveOuterElement(current);
    }
    return false;
  }

  /** Shown, and not inside an inert or hidden layer such as a covered page. */
  function isReachableLayer(element: HTMLElement) {
    return (
      element.isConnected &&
      element.getClientRects().length > 0 &&
      !isInHiddenLayer(element)
    );
  }

  /** The newest layer that matches, among the given or all shown layers. */
  function findNewestLayer(
    match: (layer: PopoverLayer) => boolean,
    layers: PopoverLayer[] = popoverLayers
  ) {
    for (let index = layers.length - 1; index >= 0; index--) {
      if (match(layers[index])) return layers[index];
    }
    return undefined;
  }

  /**
   * The popover layer a key belongs to: the newest shown layer that holds the
   * target, else the newest one opened from it, else the newest shown layer
   * of the same window. A menu outside any popover is a layer of its own, and
   * a popover opened from a menu item, such as an option submenu or a block
   * browser, is a layer above the menu.
   */
  function resolveKeyLayer(target: Element | null, view: Window | null) {
    const layers = popoverLayers.filter(({ element }) =>
      isReachableLayer(element)
    );
    const newest = (match: (layer: PopoverLayer) => boolean) =>
      findNewestLayer(match, layers)?.element;
    return (
      (target &&
        (newest(({ element }) => containsAcross(element, target)) ??
          newest(
            ({ trigger }) => !!trigger && containsAcross(trigger, target)
          ))) ||
      newest(({ element }) => element.ownerDocument.defaultView === view)
    );
  }

  /** Whether a layer was opened from the menu, directly or through others. */
  function isOpenedFromMenu(layer: HTMLElement, menu: HTMLElement) {
    const seen = new Set<HTMLElement>();
    let current = popoverLayers.find(({ element }) => element === layer);
    while (current?.trigger && !seen.has(current.element)) {
      seen.add(current.element);
      const trigger: Element = current.trigger;
      if (containsAcross(menu, trigger)) return true;
      current = findNewestLayer(({ element }) =>
        containsAcross(element, trigger)
      );
    }
    return false;
  }

  function isArrowControl(target: Element | null) {
    if (!target) return false;
    return !!target.closest(`${textSelector}, ${arrowControlSelector}`);
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
  /** The popover the menu sits in, or the menu itself outside any popover. */
  let menuLayer: HTMLElement | undefined;
  $effect(() => {
    const node = menuRef;
    if (!node) return;
    const host = findNewestLayer(({ element }) =>
      containsAcross(element, node)
    );
    const layer = host?.element ?? node;
    if (!host) addPopoverLayer({ element: node });
    menuLayer = layer;
    const entry = { menu: node, layer };
    openMenus.push(entry);
    // The menu's own window, which differs from this bundle's in a frame.
    const view = node.ownerDocument.defaultView ?? window;
    view.addEventListener("keydown", onKeydown, true);
    return () => {
      view.removeEventListener("keydown", onKeydown, true);
      openMenus.splice(openMenus.indexOf(entry), 1);
      if (!host) removePopoverLayer(node);
      menuLayer = undefined;
    };
  });
  const menu = $derived<IContextMenuGroup[]>(menuResolver ? menuResolver() : []);

  function resolveItemSize() {
    return size === Size.xl ? Size.lg : size;
  }

  /**
   * The stops Up and Down move through: the items, and one per option group,
   * the radio that takes focus in it, so the group's own arrows pick options.
   */
  function resolveMenuButtons() {
    if (!menuRef) return [];
    return Array.from(
      menuRef.querySelectorAll<HTMLButtonElement>(
        "button.contextmenuitem, [role='radio'][tabindex='0']"
      )
    ).filter((button) => !button.disabled);
  }

  /**
   * Whether the menu takes a key: the key belongs to the menu's layer and was
   * pressed in the menu, on its trigger or outside every layer, not on other
   * content of the popover. Escape also closes the menu from a layer opened
   * from one of its items, such as an option submenu, when no menu of its
   * own sits in that layer to close it.
   */
  function isKeyForMenu(event: KeyboardEvent, target: Element | null) {
    if (!menuRef || !menuLayer) return false;
    const layer = resolveKeyLayer(target, menuRef.ownerDocument.defaultView);
    if (!layer) return false;
    if (layer !== menuLayer) {
      return (
        event.key === "Escape" &&
        !openMenus.some((entry) => entry.layer === layer) &&
        isOpenedFromMenu(layer, menuRef)
      );
    }
    return (
      !target ||
      menuLayer === menuRef ||
      containsAcross(menuRef, target) ||
      !containsAcross(menuLayer, target)
    );
  }

  /**
   * Moves focus through the menu items and option groups with Up and Down
   * while the menu is shown, and closes it on Escape. Enter and Space
   * activate the focused item. It listens on the window in the capture
   * phase, so the keys reach the menu before a drawer that keeps its keys
   * inside or closes on Escape. A key goes to the front popover layer that
   * holds it (see resolveKeyLayer), so a popover opened from a menu item
   * keeps its own keys. Arrows from a control that uses them, such as an
   * option group's radios or a text field, stay with that control. Targets
   * and focus are read from the menu's own root, so this also holds for a
   * menu in a shadow root or a frame.
   */
  function onKeydown(event: KeyboardEvent) {
    if (!menuRef || !isReachableLayer(menuRef)) return;
    if (event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    if (event.altKey) return;
    const isArrow = event.key === "ArrowDown" || event.key === "ArrowUp";
    if (event.key !== "Escape" && !isArrow) return;
    const target = resolveKeyTarget(event);
    if (!isKeyForMenu(event, target)) return;
    if (event.key === "Escape") {
      const close = onClose ?? closePopover;
      if (!close) return;
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (isArrowControl(target)) return;
    const buttons = resolveMenuButtons();
    if (buttons.length === 0) return;
    const step = event.key === "ArrowDown" ? 1 : -1;
    const root = menuRef.getRootNode() as Document | ShadowRoot;
    const index = buttons.indexOf(root.activeElement as HTMLButtonElement);
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
