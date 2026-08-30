<script lang="ts">
  import ResourcePanelSwitcher from "@21n/components/resource/ResourcePanelSwitcher.svelte";
  import {
    resolveGoalContextMenu,
    type IActiveGoalStore
  } from "@21n/components/goals/goal.store";
  import { derived } from "svelte/store";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import {
    type IResourcePageWithPanels,
    ResourceAccessPoint,
    ResourceActionType
  } from "../flux/resourceStores/resource.type";
  import type { ResourcePanelType } from "../resource/resourcePanel.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import type { ISelectValue } from "@21n/types/select.type";

  let {
    goal,
    panels,
    isConstrainedWidth = false,
    isThreeColumned = false
  }: {
    goal: IActiveGoalStore;
    panels: IToggleItem[];
    isConstrainedWidth?: boolean;
    isThreeColumned?: boolean;
  } = $props();

  const adaptedStore = derived(goal, ($goal): IResourcePageWithPanels => ({
    id: $goal.id,
    panel: $goal.panel,
    defaultPanel: $goal.defaultPanel ?? $goal.panel,
    isInFocusMode: $goal.isInFocusMode,
    isInEditMode: $goal.isInEditMode,
    switchPanel: (panel?: string) => {
      if (!panel) return;
      uiState.setState(UIState.objectivePanelSelection, panel, {
        scope: UIStateScope.DEVICE,
        subVariables: [
          isConstrainedWidth.toString(),
          isThreeColumned.toString()
        ]
      });
      goal.switchPanel(panel);
    },
    closeEditMode: () => goal.toggleEditMode(false)
  }));

  function onContextMenuAction(detail: ISelectValue) {
    // TODO - custom actions
  }

  function resolveGoalThumb() {
    return $goal as unknown as IGoalThumb;
  }
</script>

<ResourcePanelSwitcher
  resourceStore={adaptedStore}
  {panels}
  accessMode={$goal.accessMode}
  {isConstrainedWidth}
  contextMenuResolver={() =>
    resolveGoalContextMenu(resolveGoalThumb(), ResourceAccessPoint.SELF)}
  onAction={onContextMenuAction}
/>
