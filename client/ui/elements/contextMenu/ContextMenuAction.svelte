<script lang="ts">
  import type { Snippet } from "svelte";
  import { popover } from "@21n/ui/actions/popover.action";
  import { elementLogger as logger } from "@21n/ui/environment/element-environment.store";
  import { createEventPropagator } from "@21n/ui/environment/event-propagator";
  import view from "@21n/ui/environment/view.store";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import {
    type IPopoverRenderBaseParams,
    PopoverTriggerMethod
  } from "@21n/ui/actions/popover.type";
  import type { IContextMenuItem } from "@21n/ui/elements/contextMenu/context-menu.type";
  import { Size } from "@21n/ui/elements/size.enum";
  import Toggle from "@21n/ui/elements/toggle/Toggle.svelte";
  import ContextMenu from "@21n/ui/elements/contextMenu/ContextMenu.svelte";
  let {
    id,
    menuResolver,
    size = Size.md,
    actionSize = Size.md,
    actionBgSize = undefined,
    tooltip = undefined,
    tooltipOptions = undefined,
    parentBgIndex = 1,
    triggerMethod = undefined,
    position = undefined,
    offsetInPx = undefined,
    isBoxed = false,
    heading = undefined,
    isPopoverVisible = $bindable(false),
    isRenderAsSibling = false,
    icon = undefined,
    testId = undefined,
    isStopPropagation = false,
    class: className = "",
    onAction = undefined,
    children = undefined
  }: {
    id: string;
    menuResolver: () => { group: string; items: IContextMenuItem[] }[];
    size?: Size.sm | Size.md | Size.lg;
    actionSize?: Size.sm | Size.md | Size.lg;
    actionBgSize?: Size.sm | Size.md | Size.lg | undefined;
    tooltip?: string | undefined;
    tooltipOptions?: IPopoverRenderBaseParams | undefined;
    parentBgIndex?: number;
    triggerMethod?: PopoverTriggerMethod | undefined;
    position?: Placement | undefined;
    offsetInPx?: number | undefined;
    isBoxed?: boolean;
    heading?: string | undefined;
    isPopoverVisible?: boolean;
    isRenderAsSibling?: boolean;
    icon?: string | undefined;
    testId?: string | undefined;
    isStopPropagation?: boolean;
    class?: string;
    onAction?: ((event: CustomEvent<any>) => void) | undefined;
    children?: Snippet | undefined;
  } = $props();
  void tooltipOptions;
  let contextMenuPopoverRef = $state<any>();
  const resolvedIcon = $derived(
    icon ?? ($view.isConstrainedWidth ? "more-outline-horizontal" : "more")
  );

  export function hide() {
    logger.log({ at: "ContextMenuAction - hide" });
    // contextMenuPopoverRef.hide();
    contextMenuPopoverRef.dispatchEvent(new CustomEvent("hide"));
    triggerEventDown("hideSecondaryMenu", {});
  }

  /**
   * Opens the menu as if its trigger were clicked, so a click closes it, and
   * moves focus into it: onto its checked option when it has one. When the
   * menu closes, focus that was left in it returns to the trigger, then
   * `onClose` runs. Returns false when it did not open the menu, including
   * for a trigger that does not open on click.
   */
  export function show(onClose?: () => void): boolean {
    const trigger = contextMenuPopoverRef as HTMLElement | undefined;
    const isClickTrigger =
      !triggerMethod || triggerMethod === PopoverTriggerMethod.CLICK;
    if (!trigger || !isClickTrigger || isPopoverVisible || findMenu(trigger))
      return false;
    const onChange = (event: Event) => {
      if ((event as CustomEvent<{ open?: boolean }>).detail?.open) {
        focusMenu(trigger);
        return;
      }
      trigger.removeEventListener("change", onChange);
      if (isFocusLost(trigger) && trigger.isConnected) trigger.focus();
      onClose?.();
    };
    trigger.addEventListener("change", onChange);
    trigger.click();
    return true;
  }

  /**
   * The trigger's own Document or ShadowRoot, which may belong to another
   * window (a same-origin iframe), so it is detected without instanceof.
   */
  function rootOf(trigger: HTMLElement): Document | ShadowRoot | null {
    const root = trigger.getRootNode();
    return "getElementById" in root ? (root as Document | ShadowRoot) : null;
  }

  /**
   * Finds the open menu where the popover renders it: beside the trigger in
   * its root, or in a popover container of the trigger's or the app document.
   */
  function findMenu(trigger: HTMLElement): HTMLElement | null {
    return (
      rootOf(trigger)?.getElementById(id) ??
      trigger.ownerDocument.getElementById(id) ??
      document.getElementById(id)
    );
  }

  function focusMenu(trigger: HTMLElement) {
    const menu = findMenu(trigger);
    const target =
      menu?.querySelector<HTMLElement>(
        '[aria-checked="true"]:not([disabled])'
      ) ?? menu?.querySelector<HTMLElement>("button:not([disabled])");
    target?.focus();
  }

  /** True when the closed menu took focus with it, so nothing holds it now. */
  function isFocusLost(trigger: HTMLElement): boolean {
    const doc = trigger.ownerDocument;
    const root = rootOf(trigger);
    const active = doc.activeElement;
    if (!active || active === doc.body) return true;
    return root && "host" in root && active === root.host
      ? !root.activeElement
      : false;
  }

  const { setEventContext, getEventContext } =
    createEventPropagator("contextMenuAction");
  setEventContext();

  const { dispatchEvent } = getEventContext();

  function triggerEventDown(event: string, detail: any) {
    dispatchEvent(event, detail);
  }

  function onSelect(item: IContextMenuItem) {
    const actionEvent = new CustomEvent<any>("action", {
      detail: item.value
    });
    onAction?.(actionEvent);
    hide();
  }

  function onPopoverChange(e: Event) {
    isPopoverVisible =
      (e as CustomEvent<{ open?: boolean }>).detail?.open ?? false;
  }
</script>

<button
  aria-label={tooltip ?? heading ?? "Actions"}
  use:popover={{
    placement: position,
    isSpanToTriggerWidth: false,
    isRenderAsModalForCW: $view.isConstrainedWidth,
    offsetInPx,
    content: ContextMenu,
    triggerMethod: triggerMethod
      ? [triggerMethod]
      : [PopoverTriggerMethod.CLICK],
    componentProps: { size, heading, menuResolver, onSelect, parentBgIndex },
    groupId: "contextMenuPopover-" + id,
    id,
    isRenderAsSibling
  }}
  data-testid={testId}
  class={className}
  onclick={(event) => {
    if (isStopPropagation) event.stopPropagation();
  }}
  onchange={onPopoverChange}
  bind:this={contextMenuPopoverRef}
>
  {#if children}
    {@render children?.()}
  {:else}
    <Toggle
      icon={resolvedIcon}
      {tooltip}
      {isBoxed}
      isRenderAsDiv={true}
      isPassive={true}
      parentBgIndex={parentBgIndex + 1}
      isPreventFillOnActive={true}
      size={actionSize}
      bgSize={actionBgSize ?? actionSize}
      bind:on={isPopoverVisible}
    />
  {/if}
</button>
