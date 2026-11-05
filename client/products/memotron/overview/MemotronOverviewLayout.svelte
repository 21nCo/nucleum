<script lang="ts">
  import type { Snippet } from "svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import view from "@21n/ui/environment/view.store";
  import { resizeListener } from "@21n/ui/actions/resize.action";
  import PanelSwitcher from "@21n/ui/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "@21n/ui/elements/switcher/switcher.enum";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";

  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { MemotronOverviewPanel } from "@nucleum/products/memotron/overview/overview.type";
  import { memotronOverviewItems } from "@nucleum/products/memotron/overview/memotron-overview-views";
  import { Product } from "@nucleum/client/config/product.type";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import ContextZoneContent from "@nucleum/shell/topNav/contextZone/ContextZoneContent.svelte";
  import {
    contextZone,
    nextCycleValue
  } from "@nucleum/shell/topNav/contextZone/context-zone";

  let {
    isConstrainedWidth = $bindable(false),
    right: rightSnippet = undefined,
    children = undefined
  }: {
    isConstrainedWidth?: boolean;
    right?: Snippet | undefined;
    children?: Snippet | undefined;
  } = $props();
  let selectedPanel = $state<MemotronOverviewPanel>(
    resolveSavedState() ?? MemotronOverviewPanel.GRAPH
  );
  const isNucleusContext = $derived($appStore.product === Product.NUCLEUM);
  const isContextZoneHosted = contextZone.isHosted;

  let containerWidth = 0;
  $effect(() => {
    isConstrainedWidth = containerWidth < 1000 || $view.isConstrainedWidth;
  });

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

  function savePanel(panel: string | undefined) {
    if (
      !panel ||
      !Object.values(MemotronOverviewPanel).includes(
        panel as MemotronOverviewPanel
      )
    )
      return;
    uiState.setState(UIState.memotronOverviewPanel, panel, {
      scope: UIStateScope.DEVICE
    });
  }

  function onPanelSwitch(event: CustomEvent) {
    savePanel(event.detail);
  }

  function cyclePanel() {
    const panel = nextCycleValue(
      memotronOverviewItems.map((item) => String(item.value)),
      selectedPanel
    );
    if (!panel) return;
    selectedPanel = panel as MemotronOverviewPanel;
    savePanel(panel);
  }
</script>

{#snippet overviewBar(isContextZone: boolean)}
  <PanelSwitcher
    items={memotronOverviewItems}
    style={PanelSwitcherStyle.BAR}
    title={isNucleusContext || isContextZone ? "" : "Overview"}
    isExpandToFullWidth={!isContextZone}
    size={Size.sm}
    bind:value={selectedPanel}
    onSwitch={onPanelSwitch}
    tempTitleWithActionDisabled={true}
  >
    {#snippet right()}
      {#if !isContextZone}
        <div class="mr-3">
          {@render rightSnippet?.()}
        </div>
      {/if}
    {/snippet}
  </PanelSwitcher>
{/snippet}

<div class="relative w-full h-full flex flex-col justify-center items-center">
  <div
    class="flex justify-between items-end gap-4 rounded-md w-full"
    use:resizeListener={(e) => {
      containerWidth = e.width;
    }}
  >
    {#if isNucleusContext}
      {@render overviewBar(false)}
    {:else}
      <ContextZoneContent cycle={cyclePanel}>
        <div class="h-full flex items-center" data-testid="overview-tabs">
          {@render overviewBar(true)}
        </div>
        {#snippet fallback()}
          {@render overviewBar(false)}
        {/snippet}
      </ContextZoneContent>
      {#if rightSnippet && $isContextZoneHosted}
        <div class="flex w-full justify-end py-1 mr-3">
          {@render rightSnippet()}
        </div>
      {/if}
    {/if}
  </div>
  <div class="relative w-full h-full">
    {@render children?.()}
  </div>
</div>
