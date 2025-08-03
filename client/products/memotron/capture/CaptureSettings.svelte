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

<div class="flex flex-col gap-6">
  <SwitchInput
    bind:checked={openNodesUponSave}
    size={Size.md}
    style={InputStyle.PLAIN}
    isExpanded={true}
    label={{
      label: "Open nodes upon save",
      tooltip: {
        body: "Automatically open newly created nodes after saving"
      }
    }}
    on:change={handleToggleChange}
  />
  <div class="flex flex-col gap-4">
    <h3 class="text-h5 text-fgs1">Capture Shortcuts</h3>
    <EditCaptureShortcuts />
  </div>
</div>
