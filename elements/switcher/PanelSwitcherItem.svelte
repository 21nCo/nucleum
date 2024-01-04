<script lang="ts">
  import { userPreferences, windowObject } from "$lib/tidy/stores/app.store";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { ColorStrength, ColorType } from "$lib/tidy/types/theme.type";
  import {
    bgClass,
    customColorStyle,
    resolveIfActiveFgFg,
    textColorClass,
  } from "$lib/tidy/utils/theme.utils";
  export let item: string;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: number | undefined = undefined;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
  $: fgColorStyle = isActive
    ? customColorStyle($userPreferences, ColorType.Fg, "a1", activeColor)
    : "";
  $: activeBgColorStyle = customColorStyle(
    $userPreferences,
    ColorType.Bg,
    "a1",
    activeColor
  );
</script>

{#if style === PanelSwitcherStyle.BOTTOMBAR || style === PanelSwitcherStyle.BOTTOMBAR_MINI}
  <button
    class="flex relative px-2 bg-transparent"
    on:click
    style={fgColorStyle}
    disabled={isDisabled}
  >
    <div
      class="font-medium min-w-fit {isActive ? '' : 'text-fgs4'} {style ===
        PanelSwitcherStyle.BOTTOMBAR && $windowObject.isInPortraitMode
        ? 'text-h4'
        : style === PanelSwitcherStyle.BOTTOMBAR_MINI &&
            $windowObject.isInPortraitMode
          ? 'text-b3'
          : style === PanelSwitcherStyle.BOTTOMBAR_MINI
            ? 'text-base'
            : 'text-h4'}"
    >
      {item}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-full rounded-lg left-0 -bottom-1 z-10"
        style="height: 5%; {activeBgColorStyle}"
      />
    {:else}
      <button
        class="absolute w-full {bgClass(
          $userPreferences.theme,
          2
        )} left-0 -bottom-1 z-10"
        style="height: 5%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.BOTTOMDOT}
  <button
    class="relative min-w-fit"
    on:click
    style={fgColorStyle}
    disabled={isDisabled}
  >
    <div
      class="{$windowObject.isInPortraitMode
        ? 'text-base'
        : 'text-h3'} {isActive ? '' : 'text-fgs3'}"
    >
      {item}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-1 h-1 -bottom-1 rounded-full"
        style="left: 40%; {activeBgColorStyle}"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.ROUNDED}
  <button
    class="relative min-w-fit rounded-full px-6 py-3"
    style={isActive ? activeBgColorStyle : ""}
    on:click
    disabled={isDisabled}
  >
    <div
      class="{$windowObject.isInPortraitMode
        ? 'text-base font-medium'
        : 'text-base'} {textColorClass(
        $userPreferences,
        ColorStrength.Normal,
        isActive,
        activeColor
      )}"
    >
      {item}
    </div>
  </button>
{/if}
