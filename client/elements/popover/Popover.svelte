<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { Position } from "$lib/client/types/direction.enum";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import {
    type IPopoverOptions,
    type IPopoverRenderParams,
    PopoverTriggerMethod
  } from "$lib/client/types/popover.type";
  import {
    dispatchCustomEvent,
    renderPopover
  } from "$lib/client/utils/browser.utils";
  import { bg, cn } from "$lib/client/utils/ui.utils";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { createEventDispatcher, onMount } from "svelte";
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
    id: generateSimpleRandomId(),
    isPreventDefaultStyling: false,
    parentBgIndex: 0,
    placement: Position.BottomCenter,
    isSpanToTriggerWidth: false,
    offsetInPx: 2,
    isUseAbsolutePositioning: false,
    groupId: undefined,
    isOnlyOneVisiblePerGroup: false
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
  let containerId = generateSimpleRandomId();

  onMount(() => {
    window.addEventListener(GlobalEvent.HIDE_POPOVER, hidePopoverListener);
    return () => {
      window.removeEventListener(GlobalEvent.HIDE_POPOVER, hidePopoverListener);
    };
  });

  function hidePopoverListener(e: any) {
    if (!e.detail || e.detail.source === containerId) return;
    if (e.detail.group === options.groupId) hide();
  }

  export function toggle() {
    logger.log({ at: "Popover - toggle", id: options.id });
    isPopoverVisible = !isPopoverVisible;
    if (isPopoverVisible) {
      show();
      dispatch("show");
    } else hide();
  }
  export function show() {
    if (options.groupId && options.isOnlyOneVisiblePerGroup) {
      dispatchCustomEvent(GlobalEvent.HIDE_POPOVER, {
        group: options.groupId,
        source: containerId
      });
    }
    const config: IPopoverRenderParams = {
      ...options,
      triggerRef: triggerRef,
      popRef: popOverRef,
      placement: options.placement ?? placement ?? Position.BottomCenter
    };
    renderPopover(config);
  }
  export function hide() {
    // logger.log({ at: "Popover - hide", id: options.id });
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

  onMount(() => {});

  function onWindowClick(x: MouseEvent) {
    // logger.log({ at: "Popover - onWindowClick", id: options.id });
    if (!options?.id || !isPopoverVisible) return;
    actIfClickedOutside(x, [containerId, options.id], hide);
  }

  /**
   * Checks if the event target is outside the target element and performs the action if true.
   *
   * Note: pop-overlay, input are excluded for the following reasons.
   *
   * pop-overlay is getting triggered when space is pressed on the input field.
   * input is excluded to prevent the action from being triggered when the input field is clicked.
   *
   * @param event the event object
   * @param target the target element
   * @param action the action to be performed
   */
  function actIfClickedOutside(
    event: PointerEvent | MouseEvent,
    target: string | string[],
    action: any
  ) {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.classList.contains("pop-overlay") ||
      event.target.nodeName === "INPUT"
    )
      return;
    const targets = Array.isArray(target) ? target : [target];
    const clickedOutsideAllTargets = targets.every((t) => {
      const nodeTarget = document.querySelector("#" + t);
      return !nodeTarget?.contains(event.target as Node);
    });
    if (clickedOutsideAllTargets) {
      logger.log({
        at: "Popover - actIfClickedOutside - performing action",
        id: options.id,
        target: event.target
      });
      action();
    }
  }
</script>

<button
  id={containerId}
  tabindex="-1"
  data-group-id={options.groupId}
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
