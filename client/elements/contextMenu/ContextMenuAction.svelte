<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { createEventPropagator } from "$lib/client/components/events/event.utils";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Position } from "$lib/client/types/direction.enum";
  import {
    type IPopoverRenderBaseParams,
    PopoverTriggerMethod
  } from "$lib/client/types/popover.type";
  import type { IContextMenu } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "../button/Button.svelte";
  import Popover from "../popover/Popover.svelte";
  import ContextMenu from "./ContextMenu.svelte";

  export let id: string;
  export let contextMenu: IContextMenu = [];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let tooltip: string | undefined = undefined;
  export let tooltipOptions: IPopoverRenderBaseParams | undefined = undefined;
  export let triggerMethod: PopoverTriggerMethod | undefined = undefined;
  export let position: Position | undefined = undefined;
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
    contextMenuPopoverRef.hide();
    triggerEventDown("hideSecondaryMenu", {});
  }

  const { setEventContext, getEventContext } =
    createEventPropagator("contextMenuAction");
  setEventContext();

  const { dispatchEvent } = getEventContext();

  function triggerEventDown(event: string, detail: any) {
    dispatchEvent(event, detail);
  }
</script>

<Popover
  bind:this={contextMenuPopoverRef}
  bind:isPopoverVisible
  triggerMethod={triggerMethod ??
    ($$slots.default
      ? PopoverTriggerMethod.RIGHT_CLICK
      : PopoverTriggerMethod.CLICK)}
  options={{
    placement:
      position ??
      ($$slots.default ? Position.BottomCenter : Position.BottomRight),
    offsetInPx,
    groupId: "contextMenuPopover-" + id,
    isOnlyOneVisiblePerGroup: true
  }}
  triggerClass={classList}
>
  <slot>
    <Button
      icon="ellipsis-vertical"
      {tooltip}
      {tooltipOptions}
      style={ButtonStyle.PLAIN}
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
</Popover>
