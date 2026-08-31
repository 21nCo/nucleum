<script lang="ts">
  import ResourcePanelSwitcher from "@21n/components/resource/ResourcePanelSwitcher.svelte";
  import {
    resolveObjectiveContextMenu,
    type IActiveObjectiveStore
  } from "@21n/components/goals/goal.store";
  import { derived } from "svelte/store";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";
  import type { IObjectiveThumb } from "@21n/components/goals/goal.type";
  import {
    type IResourcePageWithPanels,
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/data/datafn/resource.type";
  import type { ResourcePanelType } from "../resource/resourcePanel.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import type { ISelectValue } from "@21n/types/select.type";

  let {
    objective,
    panels,
    isConstrainedWidth = false,
    isThreeColumned = false
  }: {
    objective: IActiveObjectiveStore;
    panels: IToggleItem[];
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

  function onContextMenuAction(detail: ISelectValue) {
    if (detail === ResourceActionType.STAR) {
      objective.update((state) => ({
        ...state,
        isStarred: !state.isStarred
      }));
    } else if (detail === ResourceActionType.EDIT) {
      objective.toggleEditMode(!$objective.isInEditMode);
    }
  }

  function resolveObjectiveThumb() {
    return $objective as unknown as IObjectiveThumb;
  }
</script>

<ResourcePanelSwitcher
  resourceStore={adaptedStore}
  {panels}
  accessMode={$objective.accessMode}
  {isConstrainedWidth}
  contextMenuResolver={() =>
    resolveObjectiveContextMenu(resolveObjectiveThumb(), ResourceAccessPoint.SELF)}
  onAction={onContextMenuAction}
/>
