<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { trackPosition } from "$lib/client/actions/observe.action";
  import Icon from "../../Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import Tooltip from "../Tooltip.svelte";
  import type { InputLabelInfoToolTip } from "$lib/client/types/input.type";
  import { popover } from "$lib/client/actions/popover.action";
  import { PopoverTriggerMethod } from "$lib/client/types/popover.type";
  import view from "$lib/client/stores/view.store";
  export let info: InputLabelInfoToolTip;
  export let icon: string = "ph:info-light";
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
  use:popover={{
    content: Tooltip,
    triggerMethod: $view.isConstrainedWidth
      ? [PopoverTriggerMethod.CLICK]
      : [PopoverTriggerMethod.CLICK, PopoverTriggerMethod.HOVER],
    placement: info.placement ?? Placement.Right,
    isRenderAsModalForCW: true,
    componentProps: {
      info,
      onClose: closeTooltip
    }
  }}
>
  <Icon {icon} size={info.size ?? Size.sm} class="text-fgs3" />
</button>
