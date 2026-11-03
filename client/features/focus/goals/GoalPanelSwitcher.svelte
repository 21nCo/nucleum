<script lang="ts">
  import ResourceViewSwitcher from "@nucleum/features/records/ResourceViewSwitcher.svelte";
  import GoalContextTitle from "@nucleum/features/focus/goals/info/GoalContextTitle.svelte";
  import {
    resolveObjectiveContextMenu,
    type IActiveObjectiveStore
  } from "@nucleum/features/focus/goals/goal.store";
  import { derived } from "svelte/store";
  import type { IToggleItem } from "@21n/ui/elements/toggle/toggle.type";
  import type { IObjectiveThumb } from "@nucleum/features/focus/goals/goal.type";
  import {
    type AccessMode,
    type IResourcePageWithPanels,
    ResourceAccessPoint
  } from "@nucleum/datafn/resource.type";
  import type { ResourcePanelType } from "@nucleum/shared-state/resources/resource-panel.type";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { UIState, UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";

  let {
    objective,
    panels,
    accessMode = undefined,
    isConstrainedWidth = false,
    isThreeColumned = false
  }: {
    objective: IActiveObjectiveStore;
    panels: IToggleItem[];
    /** Mode this view of the goal is open in; views share one goal store. */
    accessMode?: AccessMode;
    isConstrainedWidth?: boolean;
    isThreeColumned?: boolean;
  } = $props();

  const adaptedStore = derived(
    objective,
    ($objective): IResourcePageWithPanels => ({
      id: $objective.id,
      panel: $objective.panel,
      defaultPanel: $objective.defaultPanel ?? $objective.panel,
      isInFocusMode: $objective.isInFocusMode,
      isInEditMode: $objective.isInEditMode,
      switchPanel: (panel?: string) => {
        if (!panel) return;
        uiState.setState(UIState.objectivePanelSelection, panel, {
          scope: UIStateScope.DEVICE,
          subVariables: [
            isConstrainedWidth.toString(),
            isThreeColumned.toString()
          ]
        });
        objective.switchPanel(panel);
      },
      closeEditMode: () => objective.toggleEditMode(false)
    })
  );

  function resolveObjectiveThumb() {
    return $objective as unknown as IObjectiveThumb;
  }
</script>

{#snippet contextTitle()}
  <GoalContextTitle {objective} />
{/snippet}

<ResourceViewSwitcher
  title={contextTitle}
  resourceStore={adaptedStore}
  {panels}
  {accessMode}
  {isConstrainedWidth}
  contextMenuResolver={() =>
    resolveObjectiveContextMenu(
      resolveObjectiveThumb(),
      ResourceAccessPoint.SELF
    )}
/>
