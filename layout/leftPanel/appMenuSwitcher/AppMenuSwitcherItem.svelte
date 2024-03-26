<script lang="ts">
  import { page } from "$app/stores";
  import { LayoutContext } from "$lib/tidy/types/layout.type";
  import { createEventDispatcher, onMount } from "svelte";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import view from "$lib/tidy/stores/view.store";
  import type { Action } from "$lib/tidy/types/action.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import { HapticFeedback } from "$lib/tidy/types/haptic.enum";
  import { hapticFeedback } from "$lib/tidy/utils/embed.utils";
  import {
    resolveIfActiveFgFg,
    textColorClass
  } from "$lib/tidy/utils/theme.utils";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import appearance from "$lib/tidy/stores/appearance.store";
  import Tooltip from "$lib/tidy/elements/text/Tooltip.svelte";
  import {
    renderPopoverv2,
    resolveHoverState
  } from "$lib/tidy/utils/browser.utils";
  import { Direction } from "$lib/tidy/types/direction.enum";
  const dispatch = createEventDispatcher();
  export let item: Action;
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
  }
  function onHover() {
    rive?.fire();
  }
  function hideToolTip() {
    toolTipRef.style.display = "none";
  }
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    if (resolveHoverState(event)) {
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

<button
  class="flex items-center {isShowLabel
    ? layoutContext === LayoutContext.PORTRAIT
      ? 'w-12 flex-col gap-1 text-b5 rounded-lg'
      : 'text-b2 gap-2 rounded-lg p-3 h-10'
    : 'p-4 rounded-full'} {isActive &&
    (layoutContext === LayoutContext.DEFAULT ||
      layoutContext === LayoutContext.MINIMIZED) &&
    'bg-aps1'} {isActive && layoutContext === LayoutContext.PORTRAIT
    ? ' text-aps1'
    : textColorClass(
        $appearance,
        ColorStrength.Normal,
        isActive && !(layoutContext === LayoutContext.PORTRAIT),
        -1
      )}"
  on:click={onClick}
  on:pointerenter={onHover}
  on:mouseover={toggleHoveringState}
  on:mouseout={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
>
  {#if item.icon && item.icon != "initials"}
    <!-- <RiveAnimatedIcon icon={item.icon ?? ""} bind:this={rive} /> -->
    <div class="w-6 flex justify-center" bind:this={buttonRef}>
      <Icon
        icon={item.icon}
        {isActive}
        size={layoutContext === LayoutContext.THIN ||
        layoutContext === LayoutContext.PORTRAIT
          ? Size.lg
          : Size.md}
        selectionStyle={layoutContext === LayoutContext.PORTRAIT ||
        layoutContext === LayoutContext.THIN
          ? SelectionItemActiveStyle.ACCENT_COLOR
          : SelectionItemActiveStyle.ACCENT_BACKGROUND}
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
</button>
