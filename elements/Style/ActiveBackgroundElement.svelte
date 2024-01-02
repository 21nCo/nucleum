<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { ColorStrength, ColorType } from "$lib/tidy/types/theme.type";
  import {
    bgfgClasses,
    customColorShade,
    customColorStyle,
  } from "$lib/tidy/utils/theme.utils";
  export let bgWhenInactive: number = 0;
  export let isBackgroundActive: boolean = false;
  export let isIncludeActiveBorder: boolean = false;
  export let isActivateFgWhenBgInactive: boolean = false;
  export let fgColorStrength: ColorStrength = ColorStrength.Normal;
  export let color: number | undefined = undefined;
  export let classList: string = "";
  export let styles: string = "";
  export let tabindex: number = 0;
  $: preferences = $userPreferences;
</script>

<button
  class="{classList} {bgfgClasses(
    preferences,
    bgWhenInactive - 1,
    isBackgroundActive,
    fgColorStrength,
    color
  )}"
  style={customColorStyle(
    $userPreferences,
    isBackgroundActive && isIncludeActiveBorder
      ? [ColorType.Bg, ColorType.Border]
      : isBackgroundActive
        ? ColorType.Bg
        : isActivateFgWhenBgInactive
          ? ColorType.Fg
          : ColorType.None,
    isBackgroundActive ? "a1" : "fgs1",
    color
  ) +
    (bgWhenInactive === -1 && !isBackgroundActive
      ? `background-color: ${customColorShade(
          $userPreferences,
          "bgs2",
          color,
          1
        )}`
      : "") +
    ";" +
    styles}
  on:click
  on:touchcancel
  on:touchend
  on:touchmove
  on:touchstart
  {tabindex}
>
  <slot />
</button>
