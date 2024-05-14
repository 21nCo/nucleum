<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Theme, type ColorScheme } from "$lib/tidy/types/appearance.type";
  import { appConstants } from "$lib/tidy/stores/app.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { sortArrayByOrder } from "$lib/tidy/utils/obj.utils";
  import ColorSchemeSelectorItem from "./ColorSchemeSelectorItem.svelte";
  import FormControlLabelWrapper from "$lib/tidy/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  export let theme: Theme = Theme.LIGHT;
  export let label: string = "Color scheme";
  let filteredColorSchemes: ColorScheme[];
  export let parentBackgroundIndex: number;
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
    <div class="flex flex-wrap gap-6 text-b2 max-w-md">
      {#each filteredColorSchemes as colorScheme (colorScheme.id)}
        <ColorSchemeSelectorItem
          {parentBackgroundIndex}
          {colorScheme}
          isActive={colorScheme.id === selectedSchemeId}
          on:click={() => {
            dispatch("select", colorScheme.id);
          }}
        />
      {/each}
    </div>
  {/if}
</FormControlLabelWrapper>
