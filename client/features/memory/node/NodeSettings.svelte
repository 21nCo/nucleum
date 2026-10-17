<script lang="ts">
  import SwitchInput from "@21n/ui/elements/toggle/SwitchInput.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { InputStyle } from "@21n/ui/elements/input/input.type";
  import { preferences } from "@nucleum/shared-state/preferences/preferences.store";
  import { Preference, PreferencesScope } from "@nucleum/shared-state/preferences/preferences.type";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { derived } from "svelte/store";

  const hideHighlightColors = derived(
    [preferences, appStore],
    ([$preferences, $appStore]) => {
      const key = `${$appStore.product}-${Preference.HIDE_HIGHLIGHT_COLORS}`;
      return ($preferences[key] as boolean) ?? false;
    }
  );

  function handleToggleChange(event: CustomEvent<boolean>) {
    preferences.save(Preference.HIDE_HIGHLIGHT_COLORS, event.detail, {
      scope: PreferencesScope.PRODUCT
    });
  }
</script>

<div class="flex flex-col gap-6 h-full w-full">
  <SwitchInput
    checked={$hideHighlightColors}
    size={Size.md}
    style={InputStyle.PLAIN}
    isExpanded={true}
    label={{
      label: "Don't show text highlight colors",
      tooltip: {
        body: "When enabled, text highlights from Kindle and web clips will not display their colors."
      }
    }}
    onChange={handleToggleChange}
  />
</div>
