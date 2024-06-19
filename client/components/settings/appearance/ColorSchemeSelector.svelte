<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Theme, type ColorScheme } from "$lib/client/types/appearance.type";
  import { appConstants } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import { sortArrayByOrder } from "$lib/client/utils/obj.utils";
  import ColorSchemeSelectorItem from "./ColorSchemeSelectorItem.svelte";
  import FormControlLabelWrapper from "$lib/client/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  export let theme: Theme = Theme.LIGHT;
  export let label: string = "Color scheme";
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
    <div class="flex flex-wrap gap-6 text-b2 max-w-md">
      {#each filteredColorSchemes as colorScheme (colorScheme.id)}
        <ColorSchemeSelectorItem
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
