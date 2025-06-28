<script lang="ts">
  import { onMount } from "svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { OverviewPanel } from "./overview.type";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import NucleusOverviewLayout from "./NucleusOverviewLayout.svelte";
  import AnalyticsV2 from "../../pointron/analytics/AnalyticsV2.svelte";
  import MemotronOverview from "../../memotron/overview/MemotronOverview.svelte";

  let selectedPanel: OverviewPanel = resolveSavedState() ?? OverviewPanel.FOCUS;

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.nucleusOverviewPanel, {
      scope: UIStateScope.DEVICE
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
  {#if selectedPanel === OverviewPanel.TITLE}
    <ComingSoonView />
  {:else if selectedPanel === OverviewPanel.FOCUS}
    <div class="w-full h-[90vh]">
      <AnalyticsV2 />
    </div>
  {:else if selectedPanel === OverviewPanel.MEMORY}
    <MemotronOverview />
  {/if}
</NucleusOverviewLayout>
