<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { uiState } from "$lib/client/stores/uiState.store";
  import { Action } from "$lib/client/types/action.enum";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ShortcutSettings from "../shortcuts/ShortcutSettings.svelte";
  import { InteractionMode } from "./interactionMode.type";
  let selectedMode: InteractionMode = uiState.getProductSpecificState(
    Action.MODE_OF_INTERACTION
  );
  let isShortcutHintsEnabled = uiState.getProductSpecificState(
    Action.SHOW_MORE_SHORTCUT_HINTS
  );
  function resolveInfo(mode: InteractionMode) {
    switch (mode) {
      case InteractionMode.DEFAULT:
        return "Default mode will try to blend all modes of interaction.";
      case InteractionMode.KEYBOARD_CENTRIC:
        return "In **keyboard centric mode**, additional hot keys will be enabled and shortcut hints will be shown if enabled. We have designed this mode to maximize keyboard usage eliminating the need to use trackpad or mouse.";
      case InteractionMode.COMMAND_ONLY:
        return "**Command only mode** is taking keyboard centric mode to next level. Everything will be hidden except the command bar.";
      case InteractionMode.VOICE_MODE:
        return "For a complete **hands-free experience**, turn on this mode and let the voice commander take care of the rest. Will be available soon...";
    }
  }
  function onInteractionModeSelect() {
    uiState.setProductSpecificState(Action.MODE_OF_INTERACTION, selectedMode);
  }
</script>

<div class="flex flex-col gap-6 overflow-auto">
  <OptionSelector
    bind:selected={selectedMode}
    style={OptionSelectorStyle.OUTLINE}
    size={Size.sm}
    labelProps={{
      label: "Preferred mode of interaction",
      tooltip: {
        body: "We will try to change the design of the app based your preferred mode of interaction."
      }
    }}
    on:select={onInteractionModeSelect}
    options={[
      {
        value: InteractionMode.DEFAULT,
        // TODO - icon
        icon: "clock"
      },
      {
        value: InteractionMode.KEYBOARD_CENTRIC,
        label: "Keyboard centric",
        // TODO - add keyboard icon
        icon: "rocket"
      },
      {
        value: InteractionMode.COMMAND_ONLY,
        label: "Command only mode",
        // TODO - add keyboard icon
        icon: "command"
      },
      {
        value: InteractionMode.VOICE_MODE,
        label: "Voice (coming soon)",
        icon: "microphone",
        isDisabled: true
      }
    ]}
  />
  <InlineInfoBanner content={resolveInfo(selectedMode)} />
  {#if selectedMode === InteractionMode.KEYBOARD_CENTRIC}
    <SwitchInput
      label={{
        label: "Show more shortcut hints",
        tooltip: {
          body: "More shortcut hints will be shown at relevant places throughout the app. You can turn off this setting anytime. _Note:_ Some shortcut hints will always be shown."
        }
      }}
      isExpanded={true}
      bind:checked={isShortcutHintsEnabled}
      on:change={(e) => {
        uiState.setProductSpecificState(
          Action.SHOW_MORE_SHORTCUT_HINTS,
          e.detail
        );
      }}
    />
    <SwitchInput
      label={{
        label: "Hide App menu bar on hot key",
        tooltip: {
          body: "Completely hides the app menu bar on usage of hot key ` **Q** ` overriding default behavior of minimizing."
        }
      }}
      isExpanded={true}
    />
    <Divider />
    <div class="flex flex-col items-start w-full gap-3">
      <Text content="Keyboard shortcuts" style={TextStyle.SECTION_HEADING} />
      <ShortcutSettings />
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
