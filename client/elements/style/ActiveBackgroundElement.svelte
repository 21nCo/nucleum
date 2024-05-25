<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { ColorStrength, ColorType } from "$lib/client/types/appearance.type";
  import {
    bgClass,
    customColorShade,
    customColorStyle,
    textColorClass
  } from "$lib/client/utils/theme.utils";
  export let bgWhenInactive: number = 0;
  export let isBackgroundActive: boolean = false;
  export let isIncludeActiveBorder: boolean = false;
  export let isActivateFgWhenBgInactive: boolean = false;
  export let fgColorStrength: ColorStrength = ColorStrength.Normal;
  export let color: number | undefined = undefined;
  export let classList: string = "";
  export let styles: string = "";
  export let tabindex: number = 0;
  export let transition: string = "";
  export let id: string = "";
  export { classList as class };
  function bgfgClasses(
    parentBackgroundIndex: number = 1,
    isActive: boolean = false,
    textColorStrength: ColorStrength = ColorStrength.Normal,
    bgColorHue: number | undefined
  ) {
    const background = bgClass($appearance, parentBackgroundIndex, isActive);
    const foreground = textColorClass(
      $appearance,
      textColorStrength,
      isActive,
      bgColorHue
    );
    return `${background} ${foreground}`;
  }
</script>

<button
  {id}
  class="{classList} {bgfgClasses(
    bgWhenInactive - 1,
    isBackgroundActive,
    fgColorStrength,
    color
  )} {transition}"
  style={customColorStyle(
    $appearance,
    isBackgroundActive && isIncludeActiveBorder
      ? [ColorType.Bg, ColorType.Border]
      : isBackgroundActive
        ? ColorType.Bg
        : isActivateFgWhenBgInactive
          ? ColorType.Fg
          : ColorType.None,
    isBackgroundActive ? "aps1" : "fgs1",
    color
  ) +
    (bgWhenInactive === -1 && !isBackgroundActive
      ? `background-color: ${customColorShade($appearance, "bgs2", color, 1)}`
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

<style>
  button.ease {
    transition: background-color 0.3s ease-in-out;
  }
</style>
