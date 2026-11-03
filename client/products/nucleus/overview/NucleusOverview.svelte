<svelte:options runes={true} />

<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { OverviewPanel } from "@nucleum/client/config/product.type";
  import { Action } from "@nucleum/client/config/action.enum";
  import ComingSoonView from "@21n/ui/elements/ComingSoonView.svelte";
  import AnalyticsV2 from "@nucleum/features/focus/analytics/AnalyticsV2.svelte";
  import MemotronOverview from "@nucleum/products/memotron/overview/MemotronOverview.svelte";
  import { parseMemotronOverviewPanel } from "@nucleum/products/memotron/overview/memotron-overview-views";
  import BoxSwitcher from "@21n/ui/elements/switcher/BoxSwitcher.svelte";
  import { resolveNucleusOverviewItems } from "@nucleum/products/nucleus/overview/nucleus-overview-views";

  let { subPath = undefined }: { subPath?: string[] } = $props();

  const items = resolveNucleusOverviewItems();
  let selectedPanel = $state<OverviewPanel>(resolveInitialPanel());
  let appliedSubPath = untrack(() => subPath?.join("/"));

  function parsePanel(slug: string | undefined) {
    return items.find((item) => item.value === slug)?.value as
      | OverviewPanel
      | undefined;
  }

  function resolveSavedState() {
    const savedPanel = uiState.getState(UIState.nucleusOverviewPanel, {
      scope: UIStateScope.DEVICE
    });
    if (savedPanel && Object.values(OverviewPanel).includes(savedPanel)) {
      return savedPanel;
    }
  }

  function resolveInitialPanel() {
    const fromPath = parsePanel(subPath?.[0]);
    if (fromPath) {
      savePanel(fromPath);
      return fromPath;
    }
    return resolveFollowedPanel() ?? OverviewPanel.DASHBOARD;
  }

  function savePanel(panel: OverviewPanel) {
    if (resolveSavedState() !== panel) {
      uiState.setState(UIState.nucleusOverviewPanel, panel, {
        scope: UIStateScope.DEVICE
      });
    }
    const memotronPanel = parseMemotronOverviewPanel(panel);
    if (
      memotronPanel &&
      uiState.getState(UIState.memotronOverviewPanel, {
        scope: UIStateScope.DEVICE
      }) !== memotronPanel
    ) {
      uiState.setState(UIState.memotronOverviewPanel, memotronPanel, {
        scope: UIStateScope.DEVICE
      });
    }
  }

  function onPanelSelect(event: CustomEvent) {
    const panel = parsePanel(event.detail);
    if (!panel) return;
    selectedPanel = panel;
    savePanel(panel);
  }

  function resolveFollowedPanel(): OverviewPanel | undefined {
    const saved = resolveSavedState();
    if (!saved) return;
    const memotronPanel = parseMemotronOverviewPanel(
      uiState.getState(UIState.memotronOverviewPanel, {
        scope: UIStateScope.DEVICE
      })
    );
    if (parseMemotronOverviewPanel(saved) && memotronPanel) {
      return parsePanel(memotronPanel) ?? saved;
    }
    return saved;
  }

  $effect(() => {
    const nextSubPath = subPath?.join("/");
    if (nextSubPath === appliedSubPath) return;
    appliedSubPath = nextSubPath;
    const fromPath = parsePanel(subPath?.[0]);
    if (!fromPath) return;
    selectedPanel = fromPath;
    savePanel(fromPath);
  });

  $effect(() => {
    if (!subPath || subPath.join("/") === selectedPanel) return;
    const panel = selectedPanel;
    untrack(() => navigation.replacePagePath([Action.OVERVIEW, panel]));
  });

  onMount(() => {
    const uiStateUnsub = uiState.subscribe(() => {
      const panel = resolveFollowedPanel();
      if (!panel || panel === selectedPanel) return;
      selectedPanel = panel;
      savePanel(panel);
    });

    return () => {
      uiStateUnsub();
    };
  });
</script>

<div class="w-full h-full flex flex-col">
  <div class="h-12 min-h-12 border-b border-brs3 pl-3">
    <BoxSwitcher
      options={items}
      bind:selected={selectedPanel}
      onSelect={onPanelSelect}
    />
  </div>
  {#if selectedPanel === OverviewPanel.DASHBOARD}
    <div class="w-full h-full flex">
      <div class="w-80 h-full text-fgs3 text-b2 p-3 border-r border-brs3">
        <!-- TODO -->
        dashboard sidebar
      </div>
      <AnalyticsV2 />
    </div>
  {:else if selectedPanel === OverviewPanel.GRAPH || selectedPanel === OverviewPanel.MAP}
    <MemotronOverview />
  {:else}
    <ComingSoonView />
  {/if}
</div>
