<script lang="ts">
  import { Direction } from "$lib/client/types/direction.enum";
  import type { IContextMenuItem } from "$lib/client/types/select.type";
  import Button from "../button/Button.svelte";
  import Popover from "../popover/Popover.svelte";
  import ContextMenu from "./ContextMenu.svelte";
  export let contextMenu: { group: string; items: IContextMenuItem[] }[] = [];
  let contextMenuPopoverRef: any;
</script>

<Popover
  bind:this={contextMenuPopoverRef}
  options={{ placement: Direction.BottomRight }}
>
  <Button icon="ellipsis-vertical" tooltip="More actions" />
  <slot name="popover" slot="popover">
    <ContextMenu
      menu={contextMenu}
      on:select={() => {
        contextMenuPopoverRef.hide();
      }}
    />
  </slot>
</Popover>
