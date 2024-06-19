<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { AppSkin, type ColorScheme } from "$lib/client/types/appearance.type";
  import { properCase } from "$lib/client/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let colorScheme: ColorScheme;
  export let isActive: boolean;
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
  class={cn(
    "relative flex flex-col items-center grow gap-2 mx-2 p-3 rounded-md max-w-[7rem] hover:bg-bgs3",
    {
      "bg-bgs3": isActive,
      "bg-bgs2": !isActive
    }
  )}
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
