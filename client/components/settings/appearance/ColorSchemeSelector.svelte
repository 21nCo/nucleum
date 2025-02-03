<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Theme, type ColorScheme } from "$lib/client/types/appearance.type";
  import { appConstants } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import { sortArrayByOrder } from "$lib/shared/utils/obj.utils";
  import ColorSchemeSelectorItem from "./ColorSchemeSelectorItem.svelte";
  import FormControlLabelWrapper from "$lib/client/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let theme: Theme = Theme.LIGHT;
  export let label: string = "Color scheme";
  export let size: Size.sm | Size.md = Size.md;
  let filteredColorSchemes: ColorScheme[];
  export let selectedSchemeId: string;
  const dispatch = createEventDispatcher();
  $: if (theme) refreshColorSchemes();
  function refreshColorSchemes(e: any = undefined) {
    filteredColorSchemes = appConstants.colorSchemes?.filter(
      (x) => x.theme == $appearance.skin
    );
    filteredColorSchemes = filteredColorSchemes?.filter((x: ColorScheme) => {
      return (
        (theme === Theme.LIGHT && !x.isDark) ||
        (theme == Theme.DARK && x.isDark)
      );
    });
    filteredColorSchemes = sortArrayByOrder(filteredColorSchemes);
  }
</script>

<FormControlLabelWrapper props={{ label, orientation: Orientation.Vertical }}>
  {#if filteredColorSchemes && filteredColorSchemes.length > 0}
    <div
      class={cn("flex flex-wrap text-b2 mt-2", {
        "gap-6": size === Size.md,
        "gap-4": size === Size.sm
      })}
    >
      {#each filteredColorSchemes as colorScheme (colorScheme.id)}
        <ColorSchemeSelectorItem
          {colorScheme}
          {size}
          isActive={colorScheme.id === selectedSchemeId}
          on:click={() => {
            dispatch("select", colorScheme.id);
          }}
        />
      {/each}
    </div>
  {/if}
</FormControlLabelWrapper>
