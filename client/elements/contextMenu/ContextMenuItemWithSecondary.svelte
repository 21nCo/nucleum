<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import type { IContextMenuItem } from "@21n/types/select.type";
  import { Placement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import ContextMenuItemBase from "@21n/elements/contextMenu/ContextMenuItemBase.svelte";
  import Popover from "@21n/elements/popover/Popover.svelte";
  import { createEventPropagator } from "@21n/components/events/event.utils";
  import { popover } from "@21n/actions/popover.action";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { hoverable } from "@21n/actions/hover.action";
  const dispatch = createEventDispatcher();
  export let item: IContextMenuItem;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let popoverRef: any;
  let isPopoverVisible: boolean = false;

  function onSelect(value: unknown) {
    dispatch("select", value);
  }

  function onAction(value: unknown) {
    dispatch("action", value);
  }

  function onPopoverChange(e: Event) {
    isPopoverVisible = (e as CustomEvent<{ open?: boolean }>).detail?.open ?? false;
  }

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
    isSecondary: true,
    componentProps: {
      onSelect,
      onAction,
      ...item.secondStepComponent?.props
    },
    groupId: "contextMenuPopoverSecondaryScreen",
    id: "contextMenuPopoverSecondaryScreen",
    classForHoverDismissal: "contextmenuitem"
  }}
  on:change={onPopoverChange}
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
