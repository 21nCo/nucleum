<script lang="ts">
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
  export let contextMenu: IContextMenu = [];
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let tooltip: string | undefined = undefined;
  export let tooltipOptions: IPopoverRenderBaseParams | undefined = undefined;
  let contextMenuPopoverRef: any;
</script>

<Popover
  bind:this={contextMenuPopoverRef}
  triggerMethod={$$slots.default
    ? PopoverTriggerMethod.RIGHT_CLICK
    : PopoverTriggerMethod.CLICK}
  options={{ placement: Position.BottomRight }}
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
      menu={contextMenu}
      on:action
      on:select={() => {
        contextMenuPopoverRef.hide();
      }}
    />
  </slot>
</Popover>
