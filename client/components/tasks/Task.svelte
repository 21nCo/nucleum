<script lang="ts">
  import { ActiveTaskStore, type IActiveTaskStore } from "./task.store";
  import { onMount } from "svelte";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";

  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import { PanelSwitcherStyle } from "$lib/client/types/switcher.enum";
  import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import TaskInfoPanel from "./info/TaskInfoPanel.svelte";
  import view from "$lib/client/stores/view.store";
  import { resizeListener } from "$lib/client/actions/resize.action";
  import TaskTitleRow from "./info/TaskTitleRow.svelte";
  import TaskSubtasksPanel from "./subTasks/TaskSubtasksPanel.svelte";

  export let id: string;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;

  let containerWidth = 0;
  let task: IActiveTaskStore = ActiveTaskStore.resolve(id);
  let isReady = false;

  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $task?.accessMode === ResourceAccessMode.SPLIT ||
    $task?.accessMode === ResourceAccessMode.FSPLIT ||
    containerWidth < 800;

  let selectedPanel = isConstrainedWidth ? "info" : "subtasks";

  onMount(async () => {
    task.init(accessMode);
    isReady = true;
  });

  function resolvePanelSwitcherItems(isConstrainedWidth: boolean) {
    const items = [
      {
        label: "Sub tasks",
        value: "subtasks",
        icon: "ph:tree-view-light",
        badge: $task.subTasks?.length
      },
      {
        label: "Todos",
        value: "todos",
        icon: resolveResourceIcon(Resource.todo)
      },
      {
        label: "Analytics",
        value: "analytics",
        icon: "ph:chart-line-up-light"
      },
      {
        label: "History",
        value: "history",
        icon: "ph:clock-countdown-light"
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

{#if !$task || !isReady}
  <div class="w-full h-full p-4">
    <PageLoadingPulse />
  </div>
{:else if $task}
  <div
    class="flex w-full h-full gap-4 p-4 overflow-auto"
    use:resizeListener={(e) => {
      containerWidth = e.width;
    }}
  >
    {#if !isConstrainedWidth}
      <aside class="flex flex-col gap-4 bg-bgs2 rounded-lg p-4 w-96">
        <TaskInfoPanel {task} />
      </aside>
    {/if}
    <main class="flex flex-col gap-4 flex-1 overflow-auto">
      <div
        class="flex flex-col w-full overflow-auto gap-3 bg-bgs2 rounded-lg border border-brs3"
      >
        {#if isConstrainedWidth}
          <TaskTitleRow {task} isConstrainedWidth={true} />
        {/if}
        <PanelSwitcher
          items={resolvePanelSwitcherItems(isConstrainedWidth)}
          style={PanelSwitcherStyle.BAR}
          bind:value={selectedPanel}
          isExpandToFullWidth={true}
          isPreventDropdownForCW={true}
          parentBgIndex={2}
          isBgBar={true}
        ></PanelSwitcher>
      </div>
      <div>
        {#if selectedPanel === "info"}
          <TaskInfoPanel {task} {isConstrainedWidth} />
        {:else if selectedPanel === "subtasks"}
          <TaskSubtasksPanel {task} />
        {/if}
      </div>
    </main>
  </div>
{/if}
