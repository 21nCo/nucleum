<script lang="ts">
  import { popover } from "$lib/client/actions/popover.action";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { createEventPropagator } from "$lib/client/components/events/event.utils";
  import { Placement } from "$lib/client/types/direction.enum";
  import {
    type IPopoverRenderBaseParams,
    PopoverTriggerMethod
  } from "$lib/client/types/popover.type";
  import type {
    IContextMenu,
    IContextMenuItem
  } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import Popover from "../popover/Popover.svelte";
  import Toggle from "../toggle/Toggle.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let id: string;
  export let contextMenu: IContextMenu = [];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let tooltip: string | undefined = undefined;
  export let tooltipOptions: IPopoverRenderBaseParams | undefined = undefined;
  export let triggerMethod: PopoverTriggerMethod | undefined = undefined;
  export let position: Placement | undefined = undefined;
  export let offsetInPx: number | undefined = undefined;
  export let heading: string | undefined = undefined;
  /**
   * Export only for read-only purpose to check if the context menu is visible.
   */
  export let isPopoverVisible = false;
  let classList: string = "";
  export { classList as class };
  let contextMenuPopoverRef: any;

  export function hide() {
    logger.log({ at: "ContextMenuAction - hide" });
    // contextMenuPopoverRef.hide();
    contextMenuPopoverRef.dispatchEvent(new CustomEvent("hide"));
    triggerEventDown("hideSecondaryMenu", {});
  }

  const { setEventContext, getEventContext } =
    createEventPropagator("contextMenuAction");
  setEventContext();

  const { dispatchEvent } = getEventContext();

  function triggerEventDown(event: string, detail: any) {
    dispatchEvent(event, detail);
  }

  function onSelect(item: IContextMenuItem) {
    dispatch("action", item.value);
    hide();
  }
</script>

<!-- <Popover
  bind:this={contextMenuPopoverRef}
  bind:isPopoverVisible
  triggerMethod={triggerMethod ??
    ($$slots.default
      ? PopoverTriggerMethod.RIGHT_CLICK
      : PopoverTriggerMethod.CLICK)}
  options={{
    placement:
      position ??
      ($$slots.default ? Placement.BottomCenter : Placement.BottomRight),
    offsetInPx,
    groupId: "contextMenuPopover-" + id,
    isOnlyOneVisiblePerGroup: true
  }}
  triggerClass={classList}
>
  <slot>
    <Toggle
      icon="ph:dots-three-vertical"
      {tooltip}
      isPreventFillOnActive={true}
      on={isPopoverVisible}
    />
  </slot>
  <slot name="popover" slot="popover">
    <ContextMenu
      {size}
      {heading}
      menu={contextMenu}
      on:action
      on:select={() => {
        contextMenuPopoverRef.hide();
      }}
    />
  </slot>
</Popover> -->

<button
  use:popover={{
    placement: position,
    isSpanToTriggerWidth: false,
    offsetInPx,
    content: ContextMenu,
    triggerMethod: triggerMethod ?? PopoverTriggerMethod.CLICK,
    componentProps: { size, heading, menu: contextMenu, onSelect },
    groupId: "contextMenuPopover-" + id,
    id
  }}
  class={classList}
  on:change={(e) => {
    isPopoverVisible = e.detail?.open;
  }}
  bind:this={contextMenuPopoverRef}
>
  <slot>
    <Toggle
      icon="ph:dots-three-vertical"
      {tooltip}
      isPreventFillOnActive={true}
      bind:on={isPopoverVisible}
    />
  </slot>
</button>
