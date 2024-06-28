<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { createEventDispatcher, onMount } from "svelte";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import type { IAction } from "$lib/client/types/action.type";
  import { Size } from "$lib/client/types/size.enum";
  import { HapticFeedback } from "$lib/client/types/haptic.enum";
  import { hapticFeedback } from "$lib/client/utils/embed.utils";
  import Tooltip from "$lib/client/elements/text/Tooltip.svelte";
  import { renderPopoverv2 } from "$lib/client/utils/browser.utils";
  import { Direction } from "$lib/client/types/direction.enum";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { abg, cn } from "$lib/client/utils/ui.utils";
  const dispatch = createEventDispatcher();
  export let item: IAction;
  export let layoutContext: LayoutContext = LayoutContext.DEFAULT;
  $: isActive =
    $page.params.route?.includes(item.path ?? item.action) ||
    $page.route.id?.includes(item.path ?? item.action);
  export let isShowLabel: boolean = true;
  export let parentBackgroundIndex: number;
  let buttonRef: HTMLElement;
  let toolTipRef: HTMLDivElement;
  let toolTipTimeout: any;
  let isHovering: boolean = false;
  let pad: number;
  let rive: any;
  onMount(() => {
    if (toolTipRef) hideToolTip();
  });
  $: if ($view.height) {
    let rawPad = ($view.width / 10) * $view.scale;
    pad = rawPad > 30 ? 30 : rawPad;
  }
  function onClick() {
    hapticFeedback(HapticFeedback.MENUITEM);
    rive?.fire();
    dispatch("click", {});
    if (toolTipTimeout) clearTimeout(toolTipTimeout);
    hideToolTip();
  }
  function onHover() {
    rive?.fire();
  }
  function hideToolTip() {
    toolTipRef.style.display = "none";
  }
  const toggleHoveringState = (event: CustomEvent) => {
    if (isHovering) {
      isHovering = true;
      if (toolTipTimeout) clearTimeout(toolTipTimeout);
      if (toolTipRef && layoutContext === LayoutContext.THIN)
        toolTipTimeout = setTimeout(() => {
          renderPopoverv2(buttonRef, toolTipRef, Direction.Right);
        }, 1000);
    } else {
      isHovering = false;
      if (toolTipTimeout) clearTimeout(toolTipTimeout);
      hideToolTip();
    }
  };
</script>

<HoverableElement
  class={cn("flex items-center cursor-pointer", {
    "w-12 flex-col gap-1 text-b4 rounded-lg":
      isShowLabel && layoutContext === LayoutContext.PORTRAIT,
    "text-b2 gap-2 rounded-lg p-3 h-10":
      isShowLabel && layoutContext != LayoutContext.PORTRAIT,
    "p-4 rounded-full": !isShowLabel,
    [abg()]:
      (layoutContext === LayoutContext.DEFAULT ||
        layoutContext === LayoutContext.MINIMIZED) &&
      isActive,
    "text-aps1": isActive && layoutContext === LayoutContext.PORTRAIT
  })}
  on:click={onClick}
  bind:isHovering
  on:hover={toggleHoveringState}
>
  {#if item.icon && item.icon != "initials"}
    <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
    <div class="w-6 flex justify-center" bind:this={buttonRef}>
      <Icon
        icon={item.icon}
        size={layoutContext === LayoutContext.THIN ||
        layoutContext === LayoutContext.PORTRAIT
          ? Size.lg
          : Size.md}
        class={cn({
          "fill-aps1":
            isActive &&
            (layoutContext === LayoutContext.PORTRAIT ||
              layoutContext === LayoutContext.THIN),
          "fill-abg":
            isActive &&
            (layoutContext === LayoutContext.DEFAULT ||
              layoutContext === LayoutContext.MINIMIZED)
        })}
      />
    </div>
  {:else if item.icon == "initials"}
    <div class=" w-6 flex justify-center {isActive ? 'font-medium' : ''}">
      {"Pr"}
    </div>
  {/if}
  {#if isShowLabel}
    {item.label}
  {/if}
  <div bind:this={toolTipRef}>
    <Tooltip tooltip={item.label} />
  </div>
</HoverableElement>
