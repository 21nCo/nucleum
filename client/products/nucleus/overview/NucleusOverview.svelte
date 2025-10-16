<script lang="ts">
  import { onMount } from "svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import { OverviewPanel } from "./overview.type";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
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
    const uiStateUnsub = uiState.subscribe(() => {
      selectedPanel = resolveSavedState() ?? OverviewPanel.FOCUS;
    });

    return () => {
      uiStateUnsub();
    };
  });
</script>

{#if selectedPanel === OverviewPanel.FOCUS}
  <AnalyticsV2 />
{:else if selectedPanel === OverviewPanel.MEMORY}
  <MemotronOverview />
{:else}
  <ComingSoonView />
{/if}
