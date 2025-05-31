<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import type { IContextMenuItem } from "$lib/client/types/select.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import ContextMenuItemBase from "./ContextMenuItemBase.svelte";
  import Popover from "../popover/Popover.svelte";
  import { createEventPropagator } from "$lib/client/components/events/event.utils";
  import { popover } from "$lib/client/actions/popover.action";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { hoverable } from "$lib/client/actions/hover.action";
  const dispatch = createEventDispatcher();
  export let item: IContextMenuItem;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let popoverRef: any;
  let isPopoverVisible: boolean = false;

  // const { getEventContext } = createEventPropagator("contextMenuAction");
  // const { addEventListener, removeEventListener } = getEventContext();

  // function handleParentEvent(detail: any) {
  //   popoverRef.hide();
  // }

  // onMount(() => {
  //   addEventListener("hideSecondaryMenu", handleParentEvent);
  // });

  // onDestroy(() => {
  //   removeEventListener("hideSecondaryMenu", handleParentEvent);
  // });
</script>

<button
  use:popover={{
    placement: Placement.Right,
    offsetInPx: 12,
    triggerMethod: [PopoverTriggerMethod.HOVER, PopoverTriggerMethod.CLICK],
    content: item.secondStepComponent?.component,
    componentProps: {
      onSelect: (e) => {
        dispatch("select", e);
      },
      onAction: (e) => {
        dispatch("action", e);
      },
      ...item.secondStepComponent?.props
    },
    groupId: "contextMenuPopoverSecondaryScreen",
    id: "contextMenuPopoverSecondaryScreen",
    classForHoverDismissal: "contextmenuitem"
  }}
  on:change={(e) => {
    isPopoverVisible = e.detail?.open;
  }}
  class={cn(
    "contextmenuitem flex items-center gap-2.5 justify-between hover:bg-bgs3 rounded-md",
    {
      "p-1.5": size === Size.sm,
      "p-2": size === Size.md,
      "px-3 py-2": size === Size.lg,
      "bg-bgs3": isPopoverVisible
    }
  )}
  data-context-menu-item-id={item.value}
>
  <ContextMenuItemBase {item} />
</button>
