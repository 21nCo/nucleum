<script lang="ts">
  import { onMount } from "svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { OverviewPanel } from "@21n/products/nucleus/overview/overview.type";
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import AnalyticsV2 from "@21n/products/pointron/analytics/AnalyticsV2.svelte";
  import MemotronOverview from "@21n/products/memotron/overview/MemotronOverview.svelte";

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

{#if selectedPanel === OverviewPanel.FOCUS}
  <AnalyticsV2 />
{:else if selectedPanel === OverviewPanel.MEMORY}
  <MemotronOverview />
{:else}
  <ComingSoonView />
{/if}
