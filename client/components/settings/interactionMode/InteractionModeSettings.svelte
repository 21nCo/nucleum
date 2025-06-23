<script lang="ts">
  import Divider from "$lib/client/elements/Divider.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import view from "$lib/client/stores/view.store";
  import { Action } from "$lib/client/types/action.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import ShortcutSettings from "../../shortcuts/settings/ShortcutSettings.svelte";
  import { InteractionMode } from "./interactionMode.type";
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
  let isShortcutHintsEnabled = uiState.getState(UIState.hideShortcutHints, {
    scope: UIStateScope.DEVICE
  });
  let isCompletelyHideLeftNavBar = uiState.getState(
    UIState.completelyHideLeftNavBar,
    {
      scope: UIStateScope.PRODUCT
    }
  );
  function resolveInfo(mode: InteractionMode) {
    switch (mode) {
      case InteractionMode.DEFAULT:
        return "Default mode will try to blend all modes of interaction. You can use keyboard shortcuts, command bar, hot keys and even agent when its available.";
      case InteractionMode.KEYBOARD_CENTRIC:
        return "In **keyboard centric mode**, additional hot keys will be enabled and shortcut hints will be shown if enabled. We have designed this mode to maximize keyboard usage eliminating the need to use trackpad or mouse.";
      case InteractionMode.COMMAND_ONLY:
        return "**Command only mode** is taking keyboard utilization and minimalization to next level. Everything will be hidden and can be accessed on-demand using commands.";
      case InteractionMode.AGENT:
        return "For a complete **hands-free experience**, turn on this mode and let the AI agent take care of the rest. This mode will be available soon...";
    }
  }
  function onInteractionModeSelect() {
    uiState.setState(Action.MODE_OF_INTERACTION, selectedMode, {
      scope: UIStateScope.PRODUCT
    });
  }
</script>

<div class="flex flex-col gap-6 overflow-auto">
  <OptionSelector
    bind:selected={selectedMode}
    style={OptionSelectorStyle.OUTLINE}
    size={$view.isConstrainedWidth ? Size.sm : Size.md}
    labelProps={{
      label: "Preferred mode of interaction",
      tooltip: {
        body: "We will change the design of the app based your preferred mode of interaction."
      },
      orientation: Orientation.Vertical
    }}
    on:select={onInteractionModeSelect}
    options={[
      {
        value: InteractionMode.DEFAULT,
        icon: "ph:circle-dashed-light",
        tooltip: resolveInfo(InteractionMode.DEFAULT)
      },
      {
        value: InteractionMode.COMMAND_ONLY,
        label: "Command only",
        icon: "ph:terminal-window-light"
      },
      {
        value: InteractionMode.AGENT,
        label: "Agent",
        icon: "ph:sparkle-light",
        badge: "planned",
        isDisabled: true,
        tooltip: resolveInfo(InteractionMode.AGENT)
      }
    ]}
  />
  {#if selectedMode === InteractionMode.DEFAULT}
    <SwitchInput
      label={{
        label: "Hide all hot key and shortcut hints",
        tooltip: {
          body: "All hot key and shortcut hints will be hidden at relevant places throughout the app."
        }
      }}
      isExpanded={true}
      bind:checked={isShortcutHintsEnabled}
      on:change={(e) => {
        uiState.setState(UIState.hideShortcutHints, e.detail, {
          scope: UIStateScope.DEVICE
        });
      }}
    />
    <SwitchInput
      bind:checked={isCompletelyHideLeftNavBar}
      on:change={(e) => {
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
    <Divider />
    <div class="flex flex-col items-start w-full gap-3">
      <Text content="Keyboard shortcuts" style={TextStyle.SECTION_HEADING} />
      <ShortcutSettings />
    </div>
  {:else}
    <InlineInfoBanner content={resolveInfo(selectedMode)} />
  {/if}
  <ScrollViewBottomSpacer />
</div>
