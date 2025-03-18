<script lang="ts">
  import { ActiveGoalStore, type IActiveGoalStore } from "./goal.store";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";

  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import GoalInfoPanel from "./info/GoalInfoPanel.svelte";
  import view from "$lib/client/stores/view.store";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import GoalTitleRow from "./info/GoalTitleRow.svelte";
  import SubGoalsPanel from "./sub/SubGoalsPanel.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import GoalHistory from "./history/GoalHistory.svelte";
  import GoalTasks from "./tasks/GoalTasks.svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";

  export let id: string;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;

  let containerWidth = 0;
  let goal: IActiveGoalStore = ActiveGoalStore.resolve(id);
  let isReady = false;

  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $goal?.accessMode === ResourceAccessMode.SPLIT ||
    $goal?.accessMode === ResourceAccessMode.FSPLIT ||
    containerWidth < 800;

  let selectedPanel = isConstrainedWidth ? "info" : "subgoals";

  onMount(async () => {
    const editSearchParam = $page.url.searchParams.get("edit");
    goal.init(accessMode, {
      isInEditMode: editSearchParam === "true"
    });
    isReady = true;
  });

  function resolvePanelSwitcherItems(isConstrainedWidth: boolean) {
    const items = [
      {
        label: "Sub goals",
        value: "subgoals",
        icon: resolveResourceIcon(Resource.goal),
        badge: $goal.children?.length
      },
      {
        label: "Tasks",
        value: "todos",
        icon: resolveResourceIcon(Resource.task),
        badge: $goal.tasks?.length
      },
      // {
      //   label: "Analytics",
      //   value: "analytics",
      //   icon: "ph:chart-line-up-light"
      // },
      {
        label: "History",
        value: "history",
        icon: "ph:clock-counter-clockwise-light"
      }
    ];
    if (isConstrainedWidth) {
      items.unshift({
        label: "Info",
        value: "info",
        icon: "ph:info-light"
      });
    }
    selectedPanel = items[0].value;
    return items;
  }
</script>

<CustomColorPropagator
  class="h-full w-full"
  color={$goal?.color ?? ($goal?.parent ? $goal.parent?.[0]?.color : undefined)}
>
  {#if !$goal || !isReady}
    <div class="w-full h-full p-4">
      <PageLoadingPulse />
    </div>
  {:else if $goal}
    <div
      class="flex w-full h-full gap-4 p-4 overflow-auto"
      use:resizeListener={(e) => {
        containerWidth = e.width;
      }}
    >
      {#if !isConstrainedWidth}
        <aside
          class="flex flex-col gap-4 bg--bgs2 border border-brs3 rounded-lg p-4 w-96 2k:w-[30rem]"
        >
          <GoalInfoPanel {goal} />
        </aside>
      {/if}
      <main class="flex flex-col gap-4 flex-1 overflow-auto">
        <div
          class="flex flex-col w-full overflow-auto gap-3 bg-bgs2 rounded-lg border border-brs3 shrink-0"
        >
          {#if isConstrainedWidth}
            <GoalTitleRow {goal} isConstrainedWidth={true} />
          {/if}
          <PanelSwitcher
            items={resolvePanelSwitcherItems(isConstrainedWidth)}
            style={PanelSwitcherStyle.BAR}
            bind:value={selectedPanel}
            isExpandToFullWidth={true}
            parentBgIndex={2}
            isBgBar={true}
          >
            <div slot="right">
              {#if $goal.accessMode === ResourceAccessMode.FULL}
                <Button
                  icon="ph:x-light"
                  tooltip="Close full screen"
                  parentBgIndex={2}
                  on:click={() => {
                    appStore.goBack();
                  }}
                />
              {/if}
            </div>
          </PanelSwitcher>
        </div>
        <div class="flex-1 overflow-auto">
          {#if selectedPanel === "info"}
            <GoalInfoPanel {goal} {isConstrainedWidth} />
          {:else if selectedPanel === "subgoals"}
            <SubGoalsPanel {goal} />
          {:else if selectedPanel === "history"}
            <GoalHistory {goal} />
          {:else if selectedPanel === "todos"}
            <GoalTasks id={$goal.id} />
          {/if}
        </div>
      </main>
    </div>
  {/if}
</CustomColorPropagator>
