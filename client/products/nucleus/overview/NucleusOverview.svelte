<script lang="ts">
  import { onMount } from "svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { OverviewPanel } from "./overview.type";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import NucleusOverviewLayout from "./NucleusOverviewLayout.svelte";

  let selectedPanel: OverviewPanel = resolveSavedState() ?? OverviewPanel.FOCUS;

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.nucleusOverviewPanel, {
      isDeviceScoped: true
    });
    if (savedPanel && Object.values(OverviewPanel).includes(savedPanel)) {
      return savedPanel;
    }
  }

  onMount(() => {
    uiState.subscribe((x) => {
      selectedPanel = resolveSavedState() ?? OverviewPanel.FOCUS;
    });
  });
</script>

<NucleusOverviewLayout>
  <ComingSoonView />

  {#if selectedPanel === OverviewPanel.TITLE}
    <!--  -->
  {:else if selectedPanel === OverviewPanel.FOCUS}
    <!-- -->
  {:else if selectedPanel === OverviewPanel.MEMORY}
    <!-- -->
  {/if}
</NucleusOverviewLayout>
