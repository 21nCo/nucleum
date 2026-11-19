<script lang="ts">
  import type { IContextMenuItem } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import ContextMenuItemBase from "@21n/ui/elements/contextMenu/ContextMenuItemBase.svelte";
  import { popover } from "@21n/ui/actions/popover.action";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  let {
    item,
    size = Size.md,
    isOptionGroupRow = false,
    parentBgIndex = 1,
    onAction = undefined,
    onSelect = undefined
  }: {
    item: IContextMenuItem;
    size?: Size.sm | Size.md | Size.lg;
    /**
     * Option-group submenu row: spans the menu width and opens its submenu
     * top-aligned beside it.
     */
    isOptionGroupRow?: boolean;
    /** Background index the menu was opened on; the menu surface is one above. */
    parentBgIndex?: number;
    onAction?: ((event: CustomEvent<unknown>) => void) | undefined;
    onSelect?: ((event: CustomEvent<unknown>) => void) | undefined;
  } = $props();
  let isPopoverVisible = $state(false);
  let rowRef = $state<HTMLButtonElement>();
  let isOpenedByKeyboard = false;
  let isFocusInSubmenu = false;
  /**
   * Whether the submenu shows, read from the popover's change event, which
   * does not bubble, so it is listened to on the row itself.
   */
  let isSubmenuShown = false;
  const isFocusedOnKeyboardOpen = $derived(
    !!item.secondStepComponent?.isFocusedOnKeyboardOpen
  );
  const keyboardOpenKeys = ["ArrowRight", "Enter", " "];

  /** A click without a pointer (Enter, Space) opens the submenu by keyboard. */
  function handleClickCapture(event: MouseEvent) {
    isOpenedByKeyboard = event.detail === 0;
  }

  /**
   * For a submenu that takes focus on a keyboard open: Right arrow opens a
   * closed submenu like Enter does, and Enter, Space or Right arrow on a
   * submenu already shown, such as by hover, move focus into it without
   * toggling it.
   */
  function handleKeydown(event: KeyboardEvent) {
    if (!isFocusedOnKeyboardOpen || !keyboardOpenKeys.includes(event.key))
      return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (isSubmenuShown) {
      event.preventDefault();
      focusSubmenu();
      return;
    }
    if (event.key !== "ArrowRight") return;
    event.preventDefault();
    rowRef?.click();
  }

  /** Focuses the first enabled item of the shown submenu. */
  function focusSubmenu() {
    if (!rowRef) return;
    const doc = rowRef.ownerDocument;
    const first = doc
      .getElementById("contextMenuPopoverSecondaryScreen")
      ?.querySelector<HTMLElement>("button:not([disabled])");
    first?.focus();
    isFocusInSubmenu = !!first && doc.activeElement === first;
  }

  /**
   * For a submenu that takes focus on a keyboard open: focus moves to its
   * first item, and when it closes with focus lost, back to this row.
   */
  function handoffFocus(isOpen: boolean) {
    isSubmenuShown = isOpen;
    if (!isFocusedOnKeyboardOpen || !rowRef) return;
    if (isOpen) {
      if (isOpenedByKeyboard) focusSubmenu();
      return;
    }
    const doc = rowRef.ownerDocument;
    const active = doc.activeElement;
    const isFocusLost = !active || active === doc.body;
    if (isFocusInSubmenu && isFocusLost && rowRef.isConnected) rowRef.focus();
    isFocusInSubmenu = false;
    isOpenedByKeyboard = false;
  }

  $effect(() => {
    const row = rowRef;
    if (!row) return;
    const onChange = (event: Event) =>
      handoffFocus(
        (event as CustomEvent<{ open?: boolean }>).detail?.open ?? false
      );
    row.addEventListener("change", onChange);
    return () => row.removeEventListener("change", onChange);
  });

  function handleSelect(value: unknown) {
    onSelect?.(new CustomEvent<unknown>("select", { detail: value }));
  }

  function handleAction(value: unknown) {
    onAction?.(new CustomEvent<unknown>("action", { detail: value }));
  }

  function handlePopoverChange(e: Event) {
    isPopoverVisible = (e as CustomEvent<{ open?: boolean }>).detail?.open ?? false;
  }
</script>

<button
  bind:this={rowRef}
  onclickcapture={handleClickCapture}
  onkeydown={handleKeydown}
  use:popover={{
    placement: isOptionGroupRow ? Placement.RightStart : Placement.Right,
    offsetInPx: 12,
    triggerMethod: [PopoverTriggerMethod.HOVER, PopoverTriggerMethod.CLICK],
    content: item.secondStepComponent?.component,
    isSecondary: true,
    componentProps: {
      onSelect: handleSelect,
      onAction: handleAction,
      ...item.secondStepComponent?.props
    },
    groupId: "contextMenuPopoverSecondaryScreen",
    id: "contextMenuPopoverSecondaryScreen",
    classForHoverDismissal: "contextmenuitem"
  }}
  onchange={handlePopoverChange}
  class={cn(
    "contextmenuitem flex items-center gap-2.5 justify-between hover:bg-bgs3 rounded-md",
    {
      "w-full": isOptionGroupRow,
      "p-1.5": size === Size.sm,
      "p-2": size === Size.md,
      "px-3 py-2": size === Size.lg,
      "bg-bgs3": isPopoverVisible
    }
  )}
  data-context-menu-item-id={item.value}
>
  <ContextMenuItemBase {item} {parentBgIndex} />
</button>
