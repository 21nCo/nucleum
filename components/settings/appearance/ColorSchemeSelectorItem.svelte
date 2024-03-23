<script lang="ts">
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { AppSkin, type ColorScheme } from "$lib/tidy/types/appearance.type";
  import { properCase } from "$lib/tidy/utils/text.utils";
  export let colorScheme: ColorScheme;
  export let isActive: boolean;
  export let parentBackgroundIndex: number;
  function getColors(colorScheme: ColorScheme) {
    return [
      colorScheme.colors.bgs1 ?? "",
      colorScheme.colors.bgs2 ?? "",
      colorScheme.colors.bgs3 ?? "",
      colorScheme.colors.aps1 ?? ""
    ];
  }
</script>

<button
  on:click
  class="relative flex flex-col items-center grow gap-2 mx-2 p-3 rounded-md max-w-[7rem] hover:{bgClass(
    $appearance,
    parentBackgroundIndex,
    true
  )} {isActive
    ? bgClass($appearance, parentBackgroundIndex, true)
    : bgClass($appearance, parentBackgroundIndex)}"
>
  {#if getColors(colorScheme) && $appearance.skin != AppSkin.Glassy}
    <div class="flex w-full shadow-sm">
      {#each getColors(colorScheme) as color, colorIndex}
        <div
          class="grow w-5 h-6 {colorIndex === 0
            ? 'rounded-l'
            : colorIndex === getColors(colorScheme).length - 1
              ? 'rounded-r'
              : ''}"
          style="background-color: {color}"
        />
      {/each}
    </div>
  {/if}
  {properCase(colorScheme.label)}
  {#if isActive}
    <div
      class="active-marker absolute border-2 inset-0 left-0 top-0 rounded-lg border-aps1"
    />
  {/if}
</button>

<style>
  .active-marker {
    height: calc(100% + 8px);
    width: calc(100% + 8px);
    margin: -4px;
  }
</style>
