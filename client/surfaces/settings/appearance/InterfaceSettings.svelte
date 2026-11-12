<script lang="ts">
  import SwitchInput from "@21n/ui/elements/toggle/SwitchInput.svelte";
  import Text from "@21n/ui/elements/text/Text.svelte";
  import { TextStyle } from "@21n/ui/elements/text/text.enum";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { preferences } from "@nucleum/shared-state/preferences/preferences.store";
  import {
    Preference,
    PreferencesScope
  } from "@nucleum/shared-state/preferences/preferences.type";

  let isShortcutHintsHidden = $state(
    uiState.getState(UIState.hideShortcutHints, {
      scope: UIStateScope.DEVICE
    }) ?? false
  );
  let isCompletelyHideLeftNavBar = $state(
    uiState.getState(UIState.completelyHideLeftNavBar, {
      scope: UIStateScope.PRODUCT
    }) ?? true
  );
  const isCloseNavigatorAfterOpen = $derived(
    $preferences &&
      preferences.resolve(Preference.CLOSE_NAVIGATOR_AFTER_OPEN, {
        scope: PreferencesScope.PRODUCT
      }) === true
  );
</script>

<section
  class="flex flex-col gap-6 w-full"
  data-testid="appearance-interface-settings"
  aria-label="Interface"
>
  <Text content="Interface" style={TextStyle.SECTION_HEADING} />
  <div data-testid="toggle-hide-shortcut-hints">
    <SwitchInput
      label={{
        label: "Hide all hot key and shortcut hints",
        tooltip: {
          body: "All hot key and shortcut hints will be hidden at relevant places throughout the app."
        }
      }}
      isExpanded={true}
      bind:checked={isShortcutHintsHidden}
      onChange={(e) => {
        uiState.setState(UIState.hideShortcutHints, e.detail, {
          scope: UIStateScope.DEVICE
        });
      }}
    />
  </div>
  <div data-testid="toggle-hide-menu-bar">
    <SwitchInput
      bind:checked={isCompletelyHideLeftNavBar}
      onChange={(e) => {
        uiState.setState(UIState.completelyHideLeftNavBar, e.detail, {
          scope: UIStateScope.PRODUCT
        });
      }}
      label={{
        label: "Hide App menu bar on hot key",
        tooltip: {
          body: "The hot key **Q** hides the app menu bar completely. When off, **Q** only hides the menu labels."
        }
      }}
      isExpanded={true}
    />
  </div>
  <div data-testid="toggle-close-navigator-after-open">
    <SwitchInput
      checked={isCloseNavigatorAfterOpen}
      onChange={(e) => {
        preferences.save(Preference.CLOSE_NAVIGATOR_AFTER_OPEN, e.detail, {
          scope: PreferencesScope.PRODUCT
        });
      }}
      label={{
        label: "Close navigator after opening an item",
        tooltip: {
          body: "When on, opening a page or resource from the navigator closes it. When off, the navigator stays open so you can keep jumping."
        }
      }}
      isExpanded={true}
    />
  </div>
</section>
