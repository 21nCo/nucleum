<script lang="ts">
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import EditCaptureShortcuts from "./EditCaptureShortcuts.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";

  let openNodesUponSave =
    uiState.getState(UIState.openNodesUponSave, {
      scope: UIStateScope.PRODUCT
    }) ?? true;

  function handleToggleChange(event: CustomEvent<boolean>) {
    openNodesUponSave = event.detail;
    uiState.setState(UIState.openNodesUponSave, openNodesUponSave, {
      scope: UIStateScope.PRODUCT
    });
  }
</script>

<div class="flex flex-col gap-6 h-full w-full">
  <SwitchInput
    bind:checked={openNodesUponSave}
    size={Size.md}
    style={InputStyle.PLAIN}
    isExpanded={true}
    label={{
      label: "Automatically open newly created nodes after saving",
      tooltip: {
        body: "Disabling this will save the nodes in the background without opening."
      }
    }}
    on:change={handleToggleChange}
  />
  <div class="flex flex-col flex-grow w-full">
    <Text content="Shortcuts" style={TextStyle.PANEL_HEADING_SMALL} />
    <EditCaptureShortcuts />
  </div>
</div>
