<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import { popover } from "$lib/client/actions/popover.action";
  import ButtonTooltip from "$lib/client/elements/button/ButtonTooltip.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import { cn } from "$lib/client/utils/ui.utils";
  export let icon: string;
  export let tooltip: string;
  export let shortcut: string | undefined = undefined;
  let isHovered: boolean = false;
</script>

<button
  class="flex flex-col items-center justify-center h-full px-2.5 2k:px-3 border-x border-transparent hover:border-brs3 hover:bg-bgs3 transition-colors hover:text-fgs3"
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
          parentBgIndex: 2
        }
      : {}
  }}
  on:click
>
  <Icon {icon} isFilled={isHovered} class={cn({ "text-fgs3": isHovered })} />
</button>
