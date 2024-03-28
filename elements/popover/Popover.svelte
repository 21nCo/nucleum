<script lang="ts">
  import { Direction } from "$lib/tidy/types/direction.enum";
  import { renderPopoverv2 } from "$lib/tidy/utils/browser.utils";
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  export let placement: Direction = Direction.Down;
  let triggerRef: HTMLElement;
  let popOverRef: HTMLElement;
  let isPopoverVisible = false;
  let containerId = generateUID();
  let popoverId = generateUID();
  export function toggle() {
    isPopoverVisible = !isPopoverVisible;
    if (isPopoverVisible) show();
    else hide();
  }
  export function show() {
    renderPopoverv2(triggerRef, popOverRef, placement);
  }
  export function hide() {
    isPopoverVisible = false;
    if (popOverRef) popOverRef.style.display = "none";
  }
  export function onPopoverMount(node: HTMLElement) {
    node.style.display = "none";
    return {
      destroy() {}
    };
  }
  function onWindowClick(x: MouseEvent) {
    console.log("onWindowClick", x);
    actIfClickedOutside(x, [containerId, popoverId], hide);
  }
</script>

<button id={containerId} bind:this={triggerRef} on:click={toggle}>
  <slot name="trigger" />
</button>
<div id={popoverId} bind:this={popOverRef} use:onPopoverMount>
  <slot name="popover" />
</div>
<svelte:window on:click={onWindowClick} />
