<script lang="ts">
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import view from "$lib/tidy/stores/view.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { PanelSwitcherStyle } from "$lib/tidy/types/switcher.enum";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import { bgClass, textColorClass } from "$lib/tidy/utils/theme.utils";
  import appearance from "$lib/tidy/stores/appearance.store";
  export let item: string;
  export let size: Size;
  export let isActive: boolean = false;
  export let isDisabled: boolean = false;
  export let activeColor: number | undefined = undefined;
  export let style: PanelSwitcherStyle = PanelSwitcherStyle.DEFAULT;
</script>

{#if style === PanelSwitcherStyle.BAR}
  <button
    class="flex relative bg-transparent {size === Size.md
      ? 'px-6'
      : size === Size.sm
        ? 'px-4'
        : 'px-3'}"
    on:click
    disabled={isDisabled}
  >
    <div
      class="font-medium min-w-fit {isActive
        ? 'activeFgColor'
        : 'text-fgs4'} {size === Size.md && $view.isPortrait
        ? 'text-base'
        : size === Size.sm && $view.isPortrait
          ? 'text-b2'
          : size === Size.sm
            ? 'text-base'
            : size === Size.xs
              ? 'text-b2'
              : 'text-h4'}"
    >
      {item}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-full rounded-lg left-0 -bottom-1 z-10 activeBgColor"
        style="height: 5%;"
      />
    {:else}
      <button
        class="absolute w-full {bgClass($appearance, 2)} left-0 -bottom-1 z-10"
        style="height: 5%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.DOT}
  <button class="relative min-w-fit" on:click disabled={isDisabled}>
    <div
      class="{size === Size.sm
        ? 'text-b2'
        : size === Size.md
          ? 'text-base'
          : $view.isPortrait
            ? 'text-h4'
            : 'text-h3'} {isActive ? 'activeFgColor' : 'text-fgs3'}"
    >
      {item}
    </div>
    {#if isActive}
      <div
        class="absolute opacity-80 w-1 h-1 -bottom-1 rounded-full activeBgColor"
        style="left: 40%;"
      />
    {/if}
  </button>
{:else if style === PanelSwitcherStyle.TRAIN}
  <button
    class="relative min-w-fit {size === Size.md
      ? 'rounded-full px-6 py-3'
      : 'rounded-md px-3 py-1 w-24 '} {isActive ? 'activeBgColor' : ''}"
    on:click
    disabled={isDisabled}
  >
    <div
      class="{size === Size.md && $view.isPortrait
        ? 'text-base font-medium'
        : size === Size.sm
          ? 'text-b2'
          : 'text-base'} {textColorClass(
        $appearance,
        ColorStrength.Normal,
        isActive,
        activeColor
      )}"
    >
      {item}
    </div>
  </button>
{/if}

<style>
  .activeBgColor {
    background-color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  .activeFgColor {
    color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
</style>
