<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutContext } from "$lib/client/types/layout.type";
  import { createEventDispatcher, onMount } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import type { IAction } from "$lib/client/types/action.type";
  import { Size } from "$lib/client/types/size.enum";
  import { HapticFeedback } from "$lib/client/types/haptic.enum";
  import { hapticFeedback } from "$lib/client/utils/embed.utils";
  import Tooltip from "$lib/client/elements/text/Tooltip.svelte";
  import { renderPopover } from "$lib/client/utils/browser.utils";
  import { Position } from "$lib/client/types/direction.enum";
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
  let isOutlineStyle: boolean = false;
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
          renderPopover({
            triggerRef: buttonRef,
            popRef: toolTipRef,
            placement: Position.Right
          });
        }, 1000);
    } else {
      isHovering = false;
      if (toolTipTimeout) clearTimeout(toolTipTimeout);
      hideToolTip();
    }
  };
</script>

<HoverableElement
  class={cn(
    "flex items-center cursor-pointer",
    (layoutContext === LayoutContext.DEFAULT ||
      layoutContext === LayoutContext.MINIMIZED) && {
      "bg-aps3 border-aps2 border text-aps1 hover:bg-aps2 hover:bg-opacity-70":
        isActive && isOutlineStyle,
      [abg()]: isActive && !isOutlineStyle,
      "border border-transparent": !isActive && isOutlineStyle
    },
    layoutContext === LayoutContext.PORTRAIT && {
      "w-12 flex-col gap-1 text-b4 rounded-lg": isShowLabel,
      "text-aps1": isActive
    },
    {
      "text-b2 gap-2 rounded-lg p-3 h-10":
        isShowLabel && layoutContext != LayoutContext.PORTRAIT,
      "p-4 rounded-full": !isShowLabel
    }
  )}
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
        class={cn(
          (layoutContext === LayoutContext.DEFAULT ||
            layoutContext === LayoutContext.MINIMIZED) && {
            "fill-aps1": isActive && isOutlineStyle,
            "fill-abg": isActive && !isOutlineStyle
          },
          (layoutContext === LayoutContext.PORTRAIT ||
            layoutContext === LayoutContext.THIN) && {
            "fill-aps1": isActive
          }
        )}
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
