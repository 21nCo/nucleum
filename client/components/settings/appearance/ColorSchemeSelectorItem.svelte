<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { AppSkin, type ColorScheme } from "$lib/client/types/appearance.type";
  import { properCase } from "$lib/shared/utils/text.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Size } from "$lib/client/types/size.enum";
  export let colorScheme: ColorScheme;
  export let isActive: boolean;
  export let size: Size.sm | Size.md = Size.md;
  function getColors(colorScheme: ColorScheme) {
    return [
      colorScheme.colors.bgs1 ?? "",
      colorScheme.colors.bgs2 ?? "",
      colorScheme.colors.bgs3 ?? "",
      colorScheme.colors.aps1 ?? ""
    ];
  }

  $: _colors = resolveColors(colorScheme);

  function resolveColors(scheme: ColorScheme) {
    if ($appearance.skin == AppSkin.Glassy) {
      return scheme.colors;
    }
    const colors = getColors(scheme);
    if (size == Size.sm) {
      return colors.slice(2);
    }
    return colors.slice(1);
  }
</script>

<button
  on:click
  class={cn(
    "relative flex flex-col items-center mx-2 hover:bg-bgs3 rounded-md",
    {
      "bg-bgs3": isActive,
      "bg-bgs2": !isActive,
      "p-2 text-b3 gap-1.5 w-20": size == Size.sm,
      "p-3 max-w-[7rem] text-b2 gap-2 grow": size == Size.md
    }
  )}
>
  {#if _colors && $appearance.skin != AppSkin.Glassy}
    <div class="flex w-full shadow-sm">
      {#each _colors as color, colorIndex}
        <div
          class="grow w-5 h-6 {colorIndex === 0
            ? 'rounded-l'
            : colorIndex === _colors.length - 1
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
      class={cn(
        "active-marker absolute border-2 inset-0 left-0 top-0 border-aps1 rounded-lg"
      )}
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
