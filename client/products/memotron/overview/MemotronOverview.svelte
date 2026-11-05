<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import GlobalGraph from "@nucleum/features/memory/graph/GlobalGraph.svelte";
  import MemotronOverviewLayout from "./MemotronOverviewLayout.svelte";
  import MemotronMapOverview from "@nucleum/products/memotron/overview/MemotronMapOverview.svelte";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { MemotronOverviewPanel } from "@nucleum/products/memotron/overview/overview.type";
  import { parseMemotronOverviewPanel } from "@nucleum/products/memotron/overview/memotron-overview-views";
  import { Action } from "@nucleum/client/config/action.enum";

  let {
    subPath = undefined,
    isRouted = false
  }: { subPath?: string[]; isRouted?: boolean } = $props();

  let selectedPanel = $state<MemotronOverviewPanel>(resolveInitialPanel());
  let appliedSubPath = untrack(() => subPath?.join("/"));

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

  function resolveInitialPanel() {
    const fromPath = parseMemotronOverviewPanel(subPath?.[0]);
    if (fromPath) {
      savePanel(fromPath);
      return fromPath;
    }
    return resolveSavedState() ?? MemotronOverviewPanel.GRAPH;
  }

  function savePanel(panel: MemotronOverviewPanel) {
    if (resolveSavedState() === panel) return;
    uiState.setState(UIState.memotronOverviewPanel, panel, {
      scope: UIStateScope.DEVICE
    });
  }

  $effect(() => {
    const nextSubPath = subPath?.join("/");
    if (nextSubPath === appliedSubPath) return;
    appliedSubPath = nextSubPath;
    const fromPath = parseMemotronOverviewPanel(subPath?.[0]);
    if (!fromPath) return;
    selectedPanel = fromPath;
    savePanel(fromPath);
  });

  $effect(() => {
    if (!isRouted || !subPath || subPath.join("/") === selectedPanel) return;
    const panel = selectedPanel;
    untrack(() => navigation.replacePagePath([Action.OVERVIEW, panel]));
  });

  onMount(() => {
    const uiStateUnsub = uiState.subscribe(() => {
      const panel = resolveSavedState();
      if (panel && panel !== selectedPanel) selectedPanel = panel;
    });

    return () => {
      uiStateUnsub();
    };
  });
</script>

{#if selectedPanel === MemotronOverviewPanel.GRAPH}
  <GlobalGraph layout={MemotronOverviewLayout} />
{:else if selectedPanel === MemotronOverviewPanel.MAP}
  <MemotronMapOverview />
{/if}
