<script lang="ts">
  import ResourcePanelSwitcher from "@21n/components/resource/ResourcePanelSwitcher.svelte";
  import type { IActiveGoalStore } from "@21n/components/goals/goal.store";
  import { derived } from "svelte/store";
  import type { IToggleItem } from "@21n/elements/toggle/toggle.type";

  export let goal: IActiveGoalStore;
  export let panels: IToggleItem[];
  export let isConstrainedWidth: boolean = false;

  const adaptedStore = derived(goal, ($goal) => ({
    panel: $goal.panel,
    isInFocusMode: $goal.isInFocusMode,
    switchPanel: (panel: string) => goal.switchPanel(panel)
  }));
</script>

<ResourcePanelSwitcher
  resourceStore={adaptedStore}
  {panels}
  {isConstrainedWidth}
/>
