<script lang="ts">
  import { hoverable } from "@21n/ui/actions/hover.action";
  import { popover } from "@21n/ui/actions/popover.action";
  import ButtonTooltip from "@21n/ui/elements/button/ButtonTooltip.svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Placement } from "@21n/ui/elements/direction.enum";
  import { PopoverTriggerMethod } from "@21n/ui/actions/popover.type";
  import { cn } from "@21n/ui/environment/presentation";
  import { Size } from "@21n/ui/elements/size.enum";
  let {
    icon,
    tooltip,
    shortcut = undefined,
    onClick = undefined
  }: {
    icon: string;
    tooltip: string;
    shortcut?: string;
    onClick?: (event: MouseEvent) => void;
  } = $props();
  let isHovered: boolean = false;
</script>

<button
  class="flex flex-col items-center justify-center w-full py-4 border-y border-transparent hover:border-brs3 hover:bg-bgs3-striped transition-colors hover:text-fgs3"
  use:hoverable={{
    onHover: (val) => {
      isHovered = val;
    }
  }}
  use:popover={{
    content: tooltip ? ButtonTooltip : "",
    triggerMethod: tooltip ? [PopoverTriggerMethod.HOVER] : [],
    placement: Placement.Left,
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
  onclick={onClick}
>
  <Icon {icon} isFilled={isHovered} class={cn({ "text-fgs3": isHovered })} />
  <!-- <span class="text-b5 text-fgs2">
    {tooltip}
  </span> -->
</button>
