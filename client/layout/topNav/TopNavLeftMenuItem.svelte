<script lang="ts">
  import { hoverable } from "@21n/actions/hover.action";
  import { popover } from "@21n/actions/popover.action";
  import ButtonTooltip from "@21n/elements/button/ButtonTooltip.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import { cn } from "@21n/utils/ui.utils";
  import { Size } from "@21n/types/size.enum";
  export let icon: string;
  export let tooltip: string;
  export let shortcut: string | undefined = undefined;
  export let isLastItem: boolean = false;
  let isHovered: boolean = false;
</script>

<button
  class={cn(
    "flex flex-col items-center justify-center h-full px-3 border-x border-transparent hover:border-brs3 hover:bg-bgs3-striped transition-colors hover:text-fgs3",
    {
      "pr-4": isLastItem
    }
  )}
  use:hoverable={{
    onHover: (val) => {
      isHovered = val;
    }
  }}
  use:popover={{
    content: tooltip ? ButtonTooltip : "",
    triggerMethod: tooltip ? [PopoverTriggerMethod.HOVER] : [],
    placement: Placement.BottomCenter,
    offsetInPx: 5,
    isSecondary: true,
    id: `topnav-menu-tooltip-popover-${icon || "default"}`,
    componentProps: tooltip
      ? {
          tooltip,
          shortcut,
          parentBgIndex: 2,
          size: Size.sm
        }
      : {}
  }}
  on:click
>
  <Icon {icon} isFilled={isHovered} class={cn({ "text-fgs3": isHovered })} />
</button>
