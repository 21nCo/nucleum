<script lang="ts">
  import Divider from "@21n/elements/Divider.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import view from "@21n/stores/view.store";
  import { Action } from "@21n/types/action.enum";
  import { Orientation } from "@21n/types/direction.enum";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import ShortcutSettings from "@21n/components/shortcuts/settings/ShortcutSettings.svelte";
  import { InteractionMode } from "@21n/components/settings/interactionMode/interactionMode.type";
  let selectedMode: InteractionMode = uiState.getState(
    Action.MODE_OF_INTERACTION,
    {
      scope: UIStateScope.PRODUCT
    }
  );

  // Auto-change from deprecated KEYBOARD_CENTRIC to DEFAULT
  if (selectedMode === InteractionMode.KEYBOARD_CENTRIC) {
    selectedMode = InteractionMode.DEFAULT;
    uiState.setState(Action.MODE_OF_INTERACTION, selectedMode, {
      scope: UIStateScope.PRODUCT
    });
  }
  if (
    selectedMode === InteractionMode.COMMAND_ONLY ||
    selectedMode === InteractionMode.VOICE_ONLY
  ) {
    selectedMode = InteractionMode.AGENT;
    uiState.setState(Action.MODE_OF_INTERACTION, selectedMode, {
      scope: UIStateScope.PRODUCT
    });
  }
  let isShortcutHintsEnabled = uiState.getState(UIState.hideShortcutHints, {
    scope: UIStateScope.DEVICE
  });
  let isCompletelyHideLeftNavBar = uiState.getState(
    UIState.completelyHideLeftNavBar,
    {
      scope: UIStateScope.PRODUCT
    }
  );
  function onInteractionModeSelect() {
    uiState.setState(Action.MODE_OF_INTERACTION, selectedMode, {
      scope: UIStateScope.PRODUCT
    });
  }

  $effect(() => {
    onInteractionModeSelect();
  });
</script>

<div class="flex flex-col gap-6 overflow-auto" data-testid="mode-of-interaction-settings">
  <OptionSelector
    bind:selected={selectedMode}
    style={OptionSelectorStyle.TRAIN}
    size={$view.isConstrainedWidth ? Size.sm : Size.md}
    labelProps={{
      label: "Preferred mode of interaction",
      tooltip: {
        body: "We will change the design of the app based your preferred mode of interaction."
      },
      orientation: Orientation.Vertical
    }}
    options={[
      {
        value: InteractionMode.DEFAULT,
        icon: "circle-dashed"
      },
      {
        value: InteractionMode.AGENT,
        label: "Agent",
        icon: "rhombus"
      }
    ]}
  />
  {#if selectedMode === InteractionMode.DEFAULT}
    <div data-testid="toggle-hide-shortcut-hints">
      <SwitchInput
        label={{
          label: "Hide all hot key and shortcut hints",
        tooltip: {
          body: "All hot key and shortcut hints will be hidden at relevant places throughout the app."
        }
      }}
      isExpanded={true}
      bind:checked={isShortcutHintsEnabled}
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
          body: "Completely hides the app menu bar on usage of the hot key **Q**. By default, it minimizes the app menu bar."
        }
      }}
      isExpanded={true}
      />
    </div>
    <Divider />
  {/if}
  <div class="flex flex-col items-start w-full gap-3">
    <Text content="Keyboard shortcuts" style={TextStyle.SECTION_HEADING} />
    <ShortcutSettings />
  </div>
  <ScrollViewBottomSpacer />
</div>
