<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { onMount } from "svelte";
  import Icon from "../Icon.svelte";
  import { SelectionItemActiveStyle } from "../../types/switcher.enum";
  import { bgClass, retrieveCurrentColors } from "../../utils/theme.utils";
  import { userPreferences, windowObject } from "../../stores/app.store";
  import { ButtonStyle, ButtonVariant } from "../../types/button.type";
  import { renderPopover } from "$lib/tidy/utils/ui.utils";
  import InlineLoadingAnimation from "../animations/InlineLoadingAnimation.svelte";
  export let parentBackgroundIndex: number = 1;
  export let label: string | undefined = undefined;
  /** button type description to be rendered in stories and code editor tooltips*/
  export let type: "primary" | "secondary" | "tertiary" | ButtonVariant =
    "secondary";
  export let size: Size = Size.md;
  export let width: string = "min-w-fit max-w-fit";
  export let style: ButtonStyle = ButtonStyle.DEFAULT;
  export let icon: string | undefined = undefined;
  export let isDisabled: boolean = false;
  export let tooltip: string | undefined = undefined;
  export let isLoading: boolean = false;
  // export let buttonBaseColor: string = "";
  // export let buttonActiveColor: string = "";
  // export let isActive: boolean = false;
  let toolTipRef: any;
  let buttonRef: any;
  let isHovered: boolean = false;
  let currentColors = retrieveCurrentColors($userPreferences);
  $: if (!label && icon && style == ButtonStyle.DEFAULT && !$$slots.default)
    style = ButtonStyle.PLAIN;
  let classList: string;
  function setStyles() {
    classList =
      "flex flex-row justify-center items-center min-w-fit rounded-full ";
    if (style === ButtonStyle.ROUNDED && !label && icon && !$$slots.default) {
      switch (size) {
        case Size.xl:
          classList += " p-6";
          break;
        case Size.lg:
          classList += " p-5";
          break;
        case Size.md:
          classList += " h-[3.5rem] p-4";
          break;
        case Size.sm:
          classList += " p-3";
          break;
        case Size.xs:
          classList += " p-2";
          break;
      }
    } else if ($windowObject.isInPortraitMode) {
      switch (size) {
        case Size.xl:
          classList += " h-12 gap-6 text-h2";
          break;
        case Size.lg:
          classList += " h-12 gap-4 text-h5";
          break;
        case Size.md:
          classList += " h-[2.75rem] gap-2 text-b1";
          break;
        case Size.sm:
          classList += " h-8 gap-2 text-b2";
          break;
        case Size.xs:
          classList += " h-8 gap-1 text-xs";
          break;
      }
    } else {
      switch (size) {
        case Size.xl:
          classList += " h-16 gap-6 text-base";
          break;
        case Size.lg:
          classList += " h-12 gap-4 text-base";
          break;
        case Size.md:
          classList += " h-[2.75rem] gap-2 text-base";
          break;
        case Size.sm:
          classList += " h-10 gap-2 text-b2";
          break;
        case Size.xs:
          classList += " h-8 gap-1 text-xs";
          break;
      }
    }
    if (style != ButtonStyle.PLAIN && (label || $$slots.default)) {
      switch (size) {
        case Size.xl:
          classList += " py-5 px-6";
          break;
        case Size.lg:
          classList += " py-4 px-6";
          break;
        case Size.md:
          classList += " py-3 px-6";
          break;
        case Size.sm:
          classList += " py-2 px-6";
          break;
        case Size.xs:
          classList += " py-1.5 px-3";
          break;
      }
    }
    if (type == "primary") {
      classList += " hover:opacity-90";
      if (style != ButtonStyle.PLAIN) {
        classList +=
          " bg-a1" +
          (!$userPreferences.colorScheme.isActiveFgFg ? " text-bgs1" : "");
      }
    } else if (type == "secondary") {
      classList += " text-fgs2 hover:text-a1";
      if (style != ButtonStyle.PLAIN) {
        classList +=
          " " + bgClass($userPreferences.theme, parentBackgroundIndex);
      }
    } else if (type == "danger") {
      classList += " hover:opacity-90";
      if (style != ButtonStyle.PLAIN) {
        classList +=
          " bg-ars1" +
          (!$userPreferences.colorScheme.isActiveFgFg ? " text-bgs1" : "");
      }
    } else if (type == "tertiary") {
      classList += " text-bgs1 hover:opacity-90";
      if (style != ButtonStyle.PLAIN) {
        // classList += " " + bg($userPreferences.theme, parentBackgroundIndex); we might look into that later so commenting for now
        classList += " bg-fgs1";
      }
    }
    classList = classList;
  }
  $: {
    setStyles();
  }
  onMount(() => {
    hideToolTip();
    setStyles();
  });
  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
  }
</script>

<button
  class={classList +
    ` ${width} ` +
    (isDisabled ? " opacity-70 cursor-not-allowed hover:opacity-50 " : "")}
  on:click
  bind:this={buttonRef}
  on:pointerenter={() => {
    isHovered = true;
    if (tooltip) renderPopover(buttonRef, toolTipRef);
  }}
  on:pointerleave={() => {
    isHovered = false;
    hideToolTip();
  }}
  disabled={isDisabled}
>
  {#if icon && !isLoading}
    <Icon
      {icon}
      {size}
      color={type != "secondary" && !$userPreferences.colorScheme.isActiveFgFg
        ? currentColors.bgs1
        : isHovered && type == "secondary"
          ? currentColors.a1
          : type === "secondary"
            ? currentColors.fgs2
            : currentColors.fgs1}
      selectionStyle={type != "secondary"
        ? SelectionItemActiveStyle.ACCENT_BACKGROUND
        : SelectionItemActiveStyle.NONE}
    />
  {:else if isLoading}
    <InlineLoadingAnimation />
  {/if}
  {#if label && !isLoading}
    <div class="min-w-fit">
      {label}
    </div>
  {:else}
    <slot />
  {/if}
  {#if tooltip}
    <div
      bind:this={toolTipRef}
      class="min-w-fit bg-fgs3 text-bgs1 text-b3 rounded-md z-30 px-4"
    >
      {tooltip}
    </div>
  {/if}
</button>
