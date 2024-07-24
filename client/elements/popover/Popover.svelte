<script lang="ts">
  import { Position } from "$lib/client/types/direction.enum";
  import {
    type IPopoverOptions,
    type IPopoverRenderParams,
    PopoverTriggerMethod
  } from "$lib/client/types/popover.type";
  import { renderPopover } from "$lib/client/utils/browser.utils";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { actIfClickedOutside, generateUID } from "$lib/client/utils/utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  /**
   * @deprecated
   * Use options instead.
   */
  export let placement: Position = Position.BottomCenter;
  export let triggerClass: string = "";
  /**
   * @deprecated - use triggerMethod instead
   */
  export let isPreventDefault: boolean = false;
  export let triggerMethod: PopoverTriggerMethod = PopoverTriggerMethod.CLICK;
  export let isPreventDefaultStyling: boolean = false;
  const defaultOptions: IPopoverOptions = {
    element: "div",
    class: "",
    id: generateUID(),
    isPreventDefaultStyling: false,
    parentBgIndex: 0,
    placement: Position.BottomCenter,
    isSpanToTriggerWidth: false,
    offsetInPx: 2,
    isUseAbsolutePositioning: false
  };
  export let options: IPopoverOptions = defaultOptions;
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
    const config: IPopoverRenderParams = {
      ...options,
      triggerRef: triggerRef,
      popRef: popOverRef,
      placement: options.placement ?? placement ?? Position.BottomCenter
    };
    renderPopover(config);
  }
  export function hide() {
    // console.log("hiding", { id: options.id });
    isPopoverVisible = false;
    if (popOverRef) popOverRef.style.display = "none";
    dispatch("hide");
  }
  export function onPopoverMount(node: HTMLElement) {
    node.style.display = "none";
    return {
      destroy() {}
    };
  }
  function onWindowClick(x: MouseEvent) {
    // console.log("window click", {
    //   options,
    //   isPopoverVisible,
    // });
    if (!options?.id || !isPopoverVisible) return;
    actIfClickedOutside(x, [containerId, options.id], hide);
  }
</script>

<button
  id={containerId}
  bind:this={triggerRef}
  on:click={(e) => {
    if (triggerMethod === PopoverTriggerMethod.CLICK && !isPreventDefault) {
      toggle();
    }
    if (isPopoverVisible) e.stopPropagation();
  }}
  on:contextmenu={(e) => {
    // console.log("contextmenu", e);
    if (triggerMethod === PopoverTriggerMethod.RIGHT_CLICK) {
      toggle();
    }
    e.stopPropagation();
    e.preventDefault();
  }}
  class={triggerClass}
>
  <slot />
</button>
<svelte:element
  this={options?.element ?? "div"}
  id={options?.id}
  class={cn(
    options?.class,
    options?.placement,
    bg(options?.parentBgIndex ? options?.parentBgIndex - 1 : 0),
    {
      "shadow-md border border-brs2 rounded-md": !isPreventDefaultStyling
    }
  )}
  bind:this={popOverRef}
  use:onPopoverMount
>
  <slot name="popover" />
</svelte:element>
<svelte:window on:click={onWindowClick} />
