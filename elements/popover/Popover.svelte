<script lang="ts">
  import appearance from "$lib/tidy/stores/appearance.store";
  import { Direction } from "$lib/tidy/types/direction.enum";
  import type { PopoverOptions } from "$lib/tidy/types/popover.type";
  import { renderPopoverv2 } from "$lib/tidy/utils/browser.utils";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import { cn } from "$lib/tidy/utils/ui.utils";
  import { actIfClickedOutside, generateUID } from "$lib/tidy/utils/utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  /**
   * @deprecated
   * Use options instead.
   */
  export let placement: Direction = Direction.Down;
  export let triggerClass: string = "";
  export let isPreventDefault: boolean = false;
  export let isPreventDefaultStyling: boolean = false;
  const defaultOptions: PopoverOptions = {
    element: "div",
    class: "",
    id: generateUID(),
    isPreventDefaultStyling: false,
    parentBgIndex: 0,
    placement: Direction.Down,
    isSpanToTriggerWidth: false
  };
  export let options: PopoverOptions = defaultOptions;
  if (!options.id) options.id = defaultOptions.id;
  if (!options.parentBgIndex)
    options.parentBgIndex = defaultOptions.parentBgIndex;
  let triggerRef: HTMLElement;
  let popOverRef: HTMLElement;
  /**
   * Export only for read-only purpose to check if the popover is visible.
   * Use toggle() to toggle the visibility. Use show() and hide() to show and hide the popover. Changing this value directly will not affect the popover visibility.
   */
  export let isPopoverVisible = false;
  let containerId = generateUID();
  export function toggle() {
    isPopoverVisible = !isPopoverVisible;
    if (isPopoverVisible) {
      show();
      dispatch("show");
    } else hide();
  }
  export function show() {
    renderPopoverv2(
      triggerRef,
      popOverRef,
      options.placement ?? placement ?? Direction.Down,
      options.isSpanToTriggerWidth ?? false
    );
  }
  export function hide() {
    console.log("hide", { id: options.id });
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
    if (!options.id || !isPopoverVisible) return;
    // console.log({ x, containerId, id: options.id });
    actIfClickedOutside(x, [containerId, options.id], hide);
  }
</script>

<button
  id={containerId}
  bind:this={triggerRef}
  on:click={() => {
    if (!isPreventDefault) {
      toggle();
    }
  }}
  class={triggerClass}
>
  <slot name="trigger" />
</button>
<svelte:element
  this={options.element ?? "div"}
  id={options.id}
  class={cn(options.class, bgClass($appearance, options.parentBgIndex), {
    "shadow-md border border-brs2 rounded-md": !isPreventDefaultStyling
  })}
  bind:this={popOverRef}
  use:onPopoverMount
>
  <slot name="popover" />
</svelte:element>
<svelte:window on:click={onWindowClick} />
