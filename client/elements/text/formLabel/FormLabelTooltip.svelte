<script lang="ts">
  import { Size } from "@21n/types/size.enum";
  import { trackPosition } from "@21n/actions/observe.action";
  import Icon from "@21n/elements/Icon.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import Tooltip from "@21n/elements/text/Tooltip.svelte";
  import type { InputLabelInfoToolTip } from "@21n/types/input.type";
  import { popover } from "@21n/actions/popover.action";
  import { PopoverTriggerMethod } from "@21n/types/popover.type";
  import view from "@21n/stores/view.store";
  export let info: InputLabelInfoToolTip;
  export let icon: string = "info";
  let ref: HTMLElement;

  function closeTooltip() {
    ref?.dispatchEvent(new CustomEvent("hide"));
  }
</script>

<button
  class="relative rounded-full w-fit h-fit flex justify-center items-center text-b3 text-fgs3 cursor-pointer active:bg-bgs2 notouch:hover:bg-bgs2"
  use:trackPosition={{
    callback: closeTooltip
  }}
  bind:this={ref}
  on:click|stopPropagation
  use:popover={{
    content: Tooltip,
    triggerMethod: $view.isConstrainedWidth
      ? [PopoverTriggerMethod.CLICK]
      : [PopoverTriggerMethod.CLICK, PopoverTriggerMethod.HOVER],
    placement: info.placement ?? Placement.Right,
    isRenderAsModalForCW: true,
    id: "form-label-tooltip-popover",
    componentProps: {
      info,
      onClose: closeTooltip
    }
  }}
>
  <Icon {icon} size={info.size ?? Size.sm} class="text-fgs3" />
</button>
