<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Theme, type ColorScheme } from "@21n/types/appearance.type";
  import { appConstants } from "@21n/stores/app.store";
  import appearance from "@21n/stores/appearance.store";
  import { sortArrayByOrder } from "@21n/shared-utils/obj.utils";
  import ColorSchemeSelectorItem from "@21n/components/settings/appearance/ColorSchemeSelectorItem.svelte";
  import FormControlLabelWrapper from "@21n/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  export let theme: Theme = Theme.LIGHT;
  export let label: string = "Color scheme";
  export let size: Size.sm | Size.md = Size.md;
  let filteredColorSchemes: ColorScheme[];
  export let selectedSchemeId: string;
  const dispatch = createEventDispatcher();
  $: if (theme) refreshColorSchemes();
  function refreshColorSchemes(e: any = undefined) {
    filteredColorSchemes = appConstants.colorSchemes?.filter(
      (x) => x.theme == $userPreferences?.appearance?.skin
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
        "gap-4": size === Size.md,
        "gap-3": size === Size.sm
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
