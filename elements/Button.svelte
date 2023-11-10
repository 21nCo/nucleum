<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { onMount } from "svelte";
  import Icon from "./Icon.svelte";
  import { SelectionItemActiveStyle } from "../types/switcher.enum";
  import { bg, retrieveCurrentColors } from "../utils/theme.utils";
  import { userPreferences, windowObject } from "../stores/app.store";
  import { ButtonStyle } from "../types/button.type";
  export let parentBackgroundIndex: number = 1;
  export let label: string | undefined = undefined;
  export let type: string = "secondary";
  export let size: Size = Size.md;
  export let width: string = "max-w-fit";
  export let style: ButtonStyle = ButtonStyle.DEFAULT;
  export let icon: string | undefined = undefined;
  export let isDisabled: boolean = false;
  let isHovered: boolean = false;
  let currentColors = retrieveCurrentColors($userPreferences);
  $: if (!label && icon && style == ButtonStyle.DEFAULT)
    style = ButtonStyle.PLAIN;
  let classList =
    "flex flex-row gap-2 justify-center items-center min-w-fit " +
    (style === ButtonStyle.ROUNDED || size === Size.xs
      ? " rounded-full"
      : " rounded-md") +
    ` ${width} `;
  onMount(() => {
    if ($windowObject.isInPortraitMode) {
      switch (size) {
        case Size.xl:
          classList += " text-h2";
          break;
        case Size.lg:
          classList += " text-h5";
          break;
        case Size.md:
          classList += " text-b1";
          break;
        case Size.sm:
          classList += " text-b2";
          break;
        case Size.xs:
          classList += " text-xs";
          break;
      }
    } else {
      switch (size) {
        case Size.xl:
          classList += " text-h2";
          break;
        case Size.lg:
          classList += " text-h5";
          break;
        case Size.md:
          classList += " text-base";
          break;
        case Size.sm:
          classList += " text-b2";
          break;
        case Size.xs:
          classList += " text-xs";
          break;
      }
    }
    if (style != ButtonStyle.PLAIN) {
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
        classList += " bg-a1 text-bgs1";
      }
    } else if (type == "secondary") {
      classList += " text-fgs2 hover:text-a1";
      if (style != ButtonStyle.PLAIN) {
        classList += " " + bg($userPreferences.theme, parentBackgroundIndex);
      }
    } else if (type == "tertiary") {
      classList += " text-bgs1 hover:opacity-90";
      if (style != ButtonStyle.PLAIN) {
        // classList += " " + bg($userPreferences.theme, parentBackgroundIndex); we might look into that later so commenting for now
        classList += " bg-fgs1";
      }
    }
  });
</script>

<button
  class={classList +
    (isDisabled ? " opacity-50 cursor-not-allowed hover:opacity-50 " : "")}
  on:click
  on:pointerenter={() => {
    isHovered = true;
  }}
  on:pointerleave={() => {
    isHovered = false;
  }}
  disabled={isDisabled}
>
  {#if icon}
    <Icon
      {icon}
      {size}
      color={type === "primary"
        ? currentColors.bgs1
        : isHovered
        ? currentColors.a1
        : currentColors.fgs2}
      selectionStyle={type === "primary"
        ? SelectionItemActiveStyle.ACCENT_BACKGROUND
        : SelectionItemActiveStyle.NONE}
    />
  {/if}
  {#if label}
    {label}
  {:else}
    <slot />
  {/if}
</button>
