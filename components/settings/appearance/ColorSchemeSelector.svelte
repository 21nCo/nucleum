<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Theme, type ColorScheme } from "$lib/tidy/types/appearance.type";
  import { appConstants } from "$lib/tidy/stores/app.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { sortArrayByOrder } from "$lib/tidy/utils/obj.utils";
  import ColorSchemeSelectorItem from "./ColorSchemeSelectorItem.svelte";
  import FormControlLabel from "$lib/tidy/elements/text/formLabel/FormControlLabel.svelte";
  import InlineInfoBanner from "$lib/tidy/elements/text/InlineInfoBanner.svelte";
  export let theme: Theme = Theme.LIGHT;
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

{#if filteredColorSchemes && filteredColorSchemes.length > 0}
  <FormControlLabel label="Color scheme" />
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
{:else if theme === Theme.SYSTEM}
  <InlineInfoBanner
    content="Dark and light themes will be switched automatically according to the system
setting on your device."
    action="discord"
  />
{/if}
