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

<!-- <Popover
  bind:this={popoverRef}
  bind:isPopoverVisible
  triggerClass={cn(
    "flex items-center gap-2.5 justify-between hover:bg-bgs3 rounded-md",
    {
      "p-1.5": size === Size.sm,
      "p-2": size === Size.md,
      "px-3 py-2": size === Size.lg,
      "bg-bgs3": isPopoverVisible
    }
  )}
  options={{
    placement: Placement.Right,
    offsetInPx: 12,
    groupId: "contextMenuPopoverSecondaryScreen",
    isOnlyOneVisiblePerGroup: true
  }}
>
  <ContextMenuItem {item} />
  <slot name="popover" slot="popover">
    <svelte:component
      this={item.secondStepComponent?.component}
      {...item.secondStepComponent?.props}
      on:select={(e) => {
        if (item.callback) item.callback(e.detail);
        dispatch("select", item);
        dispatch("action", item.value);
        popoverRef.hide();
      }}
    />
  </slot>
</Popover> -->

<button
  use:popover={{
    placement: Placement.Right,
    offsetInPx: 12,
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
    id: "contextMenuPopoverSecondaryScreen" + Math.random()
  }}
  on:change={(e) => {
    isPopoverVisible = e.detail?.open;
  }}
  class={cn(
    "flex items-center gap-2.5 justify-between hover:bg-bgs3 rounded-md",
    {
      "p-1.5": size === Size.sm,
      "p-2": size === Size.md,
      "px-3 py-2": size === Size.lg,
      "bg-bgs3": isPopoverVisible
    }
  )}
>
  <ContextMenuItemBase {item} />
</button>
