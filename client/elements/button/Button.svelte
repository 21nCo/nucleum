<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import Icon from "../Icon.svelte";
  import { SelectionItemActiveStyle } from "../../types/switcher.enum";
  import {
    bgClass,
    retrieveCurrentColors,
    textColorClass
  } from "$lib/client/utils/theme.utils";
  import { ButtonStyle, ButtonVariant } from "../../types/button.type";
  import {
    renderPopoverv2,
    resolveHoverState
  } from "$lib/client/utils/browser.utils";
  import InlineLoadingAnimation from "../feedback/animations/InlineLoadingAnimation.svelte";
  import { Direction } from "$lib/client/types/direction.enum";
  import Tooltip from "../text/Tooltip.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Color, ColorStrength } from "$lib/client/types/appearance.type";
  export let parentBackgroundIndex: number = 1;
  export let label: string | undefined = undefined;
  /** button type description to be rendered in stories and code editor tooltips*/
  export let type: "primary" | "secondary" | "danger" | ButtonVariant =
    ButtonVariant.SECONDARY;
  export let size: Size.xs | Size.sm | Size.md | Size.lg = Size.md;
  export let width: string = "min-w-fit max-w-fit";
  export let style: ButtonStyle = ButtonStyle.DEFAULT;
  export let icon: string | undefined = undefined;
  export let isDisabled: boolean = false;
  export let tooltip: string | undefined = undefined;
  export let toolTipPlacement: Direction = Direction.Down;
  export let isLoading: boolean = false;
  /**
   * Applicable when {@link ButtonStyle.PLAIN} style is choosen
   */
  export let isUnderlined: boolean = false;
  /**
   * @deprecated - Use toggle instead
   */
  export let isStayActive: boolean = false;
  export let id: string = "";
  // export let buttonBaseColor: string = "";
  // export let buttonActiveColor: string = "";
  // export let isActive: boolean = false;
  let toolTipRef: any;
  let buttonRef: any;
  export let isHovering: boolean = false;
  let currentColors = retrieveCurrentColors($appearance);
  $: if (!label && icon && style == ButtonStyle.DEFAULT && !$$slots.default)
    style = ButtonStyle.PLAIN;
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    if (resolveHoverState(event)) {
      isHovering = true;
      if (tooltip) renderPopoverv2(buttonRef, toolTipRef, toolTipPlacement);
    } else {
      isHovering = false;
      hideToolTip();
    }
  };
  onMount(() => {
    hideToolTip();
  });
  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
  }
  function resolveIconColor(isHovering: boolean = false) {
    if (style === ButtonStyle.OUTLINED) {
      if (type === ButtonVariant.PRIMARY) return Color.PRIMARY;
      else if (type === ButtonVariant.DANGER) return Color.RED;
    } else if (type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER)
      return Color.ACTIVE_FG;
    else if (type === ButtonVariant.SECONDARY)
      return isHovering ? Color.FG : Color.FGS2;
    else return Color.FG;
  }
</script>

<button
  {id}
  class={cn(
    "flex flex-row justify-center items-center min-w-fit rounded-full",
    width,
    {
      "opacity-70 cursor-not-allowed hover:opacity-50": isDisabled,
      "gap-4 text-base": size === Size.lg,
      "gap-2 text-b2 dp:text-base": size === Size.md,
      "gap-2 text-b3 dp:text-b2": size === Size.sm,
      "gap-1 text-b4 dp:text-b3": size === Size.xs
    },
    style != ButtonStyle.PLAIN &&
      (label || $$slots.default) && {
        "shadow--md": true,
        "h-12 py-4 px-6": size === Size.lg,
        "h-[2.75rem] py-3 px-5": size === Size.md,
        "h-8 py-2 px-4": size === Size.sm,
        "h-6 py-1 px-3": size === Size.xs
      },
    style === ButtonStyle.DEFAULT && [
      (type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER) &&
        textColorClass($appearance, ColorStrength.Normal, true),
      type === ButtonVariant.SECONDARY &&
        bgClass($appearance, parentBackgroundIndex),
      {
        "hover:opacity-90":
          type === ButtonVariant.PRIMARY || type === ButtonVariant.DANGER,
        "bg-aps1": type === ButtonVariant.PRIMARY,
        "bg-ars1": type === ButtonVariant.DANGER,
        "border border-transparent hover:border-brs3":
          type === ButtonVariant.SECONDARY
      }
    ],
    style === ButtonStyle.OUTLINED && [
      bgClass($appearance, parentBackgroundIndex - 1),
      {
        border: true,
        "border-aps1 text-aps1": type === ButtonVariant.PRIMARY,
        "border-brs3 text-fgs2 hover:text-fgs1 hover:border-fgs3":
          type === ButtonVariant.SECONDARY,
        "border-ars1 text-ars1": type === ButtonVariant.DANGER
      }
    ],
    style === ButtonStyle.PLAIN && [
      "text-fgs2 hover:text-aps1",
      {
        "underline-dotted hover:underline-dotted-primary": isUnderlined
      }
    ]
  )}
  on:click
  bind:this={buttonRef}
  on:mouseover={toggleHoveringState}
  on:mouseleave={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
  disabled={isDisabled}
>
  {#if isLoading}
    <InlineLoadingAnimation />
  {:else}
    {#if icon}
      <Icon
        {icon}
        {size}
        accent={resolveIconColor(isHovering)}
        selectionStyle={type != "secondary"
          ? SelectionItemActiveStyle.ACCENT_BACKGROUND
          : SelectionItemActiveStyle.NONE}
      />
    {/if}
    {#if label}
      <div class="min-w-fit">
        {label}
      </div>
    {:else}
      <slot />
    {/if}
  {/if}

  {#if tooltip}
    <div bind:this={toolTipRef}>
      <Tooltip {tooltip} />
    </div>
  {/if}
</button>
