<script lang="ts">
  import { Theme, type ColorScheme } from "@21n/theme/appearance.type";
  import { appConstants } from "@nucleum/shared-state/app-context/app.store";
  import appearance from "@nucleum/shared-state/appearance/appearance.store";
  import { sortArrayByOrder } from "@21n/shared-utils/obj.utils";
  import ColorSchemeSelectorItem from "@nucleum/surfaces/settings/appearance/ColorSchemeSelectorItem.svelte";
  import FormControlLabelWrapper from "@21n/ui/elements/text/formLabel/FormControlLabelWrapper.svelte";
  import { Orientation } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";

  let {
    theme = Theme.LIGHT,
    label = "Color scheme",
    size = Size.md,
    selectedSchemeId,
    onSelect = undefined
  }: {
    theme?: Theme;
    label?: string;
    size?: Size.sm | Size.md;
    selectedSchemeId: string;
    onSelect?: ((event: CustomEvent<string>) => void) | undefined;
  } = $props();
  const filteredColorSchemes = $derived.by(() => {
    if (!theme) return [];
    let items = appConstants.colorSchemes?.filter(
      (x) => x.theme == $userPreferences?.appearance?.skin
    );
    items = items?.filter((x: ColorScheme) => {
      return (
        (theme === Theme.LIGHT && !x.isDark) ||
        (theme == Theme.DARK && x.isDark)
      );
    });
    return sortArrayByOrder(items);
  });

  function emitSelect(id: string) {
    const selectEvent = new CustomEvent<string>("select", { detail: id });
    onSelect?.(selectEvent);
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
          onclick={() => emitSelect(colorScheme.id)}
        />
      {/each}
    </div>
  {/if}
</FormControlLabelWrapper>
