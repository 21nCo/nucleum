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

  export let goal: IActiveGoalStore;
  export let panels: IToggleItem[];
  export let isConstrainedWidth: boolean = false;
  export let isThreeColumned: boolean = false;

  const adaptedStore = derived(
    goal,
    ($goal): IResourcePageWithPanels => ({
      id: $goal.id,
      panel: $goal.panel,
      defaultPanel: $goal.defaultPanel ?? $goal.panel,
      isInFocusMode: $goal.isInFocusMode,
      isInEditMode: $goal.isInEditMode,
      switchPanel: (panel?: string) => {
        if (!panel) return;
        uiState.setState(UIState.goalPanelSelection, panel, {
          scope: UIStateScope.DEVICE,
          subVariables: [
            isConstrainedWidth.toString(),
            isThreeColumned.toString()
          ]
        });
        goal.switchPanel(panel);
      },
      closeEditMode: () => goal.toggleEditMode(false)
    })
  );

  function onContextMenuAction(
    e: CustomEvent<ResourcePanelType | ResourceActionType>
  ) {
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
  on:action={onContextMenuAction}
/>
