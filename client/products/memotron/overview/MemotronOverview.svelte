<script lang="ts">
  import { onMount } from "svelte";
  import GlobalGraph from "../graph/GlobalGraph.svelte";
  import MemotronMapOverview from "./MemotronMapOverview.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "$lib/client/stores/uiState/uiState.type";
  import MemotronDefaultOverview from "./MemotronDefaultOverview.svelte";
  import { MemotronOverviewPanel } from "./overview.type";

  let selectedPanel: MemotronOverviewPanel =
    resolveSavedState() ?? MemotronOverviewPanel.GRAPH;

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.memotronOverviewPanel, {
      scope: UIStateScope.DEVICE
    });
    if (
      savedPanel &&
      Object.values(MemotronOverviewPanel).includes(savedPanel)
    ) {
      return savedPanel;
    }
  }

  onMount(() => {
    uiState.subscribe((x) => {
      selectedPanel = resolveSavedState() ?? MemotronOverviewPanel.GRAPH;
    });
  });
</script>

{#if selectedPanel === MemotronOverviewPanel.TITLE}
  <MemotronDefaultOverview />
{:else if selectedPanel === MemotronOverviewPanel.GRAPH}
  <GlobalGraph />
{:else if selectedPanel === MemotronOverviewPanel.MAP}
  <MemotronMapOverview />
{/if}
