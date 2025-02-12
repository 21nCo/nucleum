<script lang="ts">
  import {
    ActiveTaskStore,
    resolveTaskContextMenu,
    type IActiveTaskStore
  } from "./task.store";
  import { onMount } from "svelte";
  import PageLoadingPulse from "$lib/client/elements/feedback/animations/PageLoadingPulse.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { resolveTaskTypeIcon } from "./task.utils";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import PanelSwitcher from "$lib/client/elements/switcher/PanelSwitcher.svelte";
  import {
    BarStyle,
    PanelSwitcherStyle
  } from "$lib/client/types/switcher.enum";
  import { resolveResourceIcon } from "../flux/resourceStores/resource.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import ContextMenuAction from "$lib/client/elements/contextMenu/ContextMenuAction.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import TaskCollectionsLane from "./TaskCollectionsLane.svelte";

  export let id: string;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.POP;

  let task: IActiveTaskStore = ActiveTaskStore.resolve(id);
  let isReady = false;

  onMount(async () => {
    task.init(accessMode);
    isReady = true;
  });
</script>

{#if !$task || !isReady}
  <div class="w-full h-full p-4">
    <PageLoadingPulse />
  </div>
{:else if $task}
  <div class="flex w-full h-full gap-4 p-4">
    <aside class="flex flex-col gap-4 bg-bgs2 rounded-lg p-4 w-80">
      <div class="flex items-center gap-3">
        <!-- <Icon icon={resolveTaskTypeIcon($task.type)} class="text-fgs3" /> -->
        <h1 class="text-h3 font-medium">{$task.label}</h1>
        <ContextMenuAction
          menuResolver={() =>
            resolveTaskContextMenu($task, ResourceAccessPoint.SELF)}
          position={Placement.BottomCenter}
          id="taskContextMenu"
          size={Size.lg}
        />
      </div>
      <div>
        <TaskCollectionsLane {task} />
      </div>
      {#if $task.startDate || $task.endDate}
        <div class="text-b2 text-fgs3">
          {#if $task.startDate}
            {formatDatetime($userPreferences, $task.startDate)}
          {/if}
          {#if $task.endDate}
            - {formatDatetime($userPreferences, $task.endDate)}
          {/if}
        </div>
      {/if}

      {#if $task.description}
        <div class="mt-4">
          <span class="text-b2 text-fgs3">Description</span>
          <Markdown md={$task.description} />
        </div>
      {/if}
    </aside>
    <main class="flex flex-col gap-4 flex-1">
      <div
        class="flex items-center gap-3 bg-bgs2 rounded-lg border border-brs3"
      >
        <PanelSwitcher
          items={[
            {
              label: "Sub tasks",
              value: "subtasks",
              icon: "ph:tree-view-light"
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
          ]}
          style={PanelSwitcherStyle.BAR}
          isExpandToFullWidth={true}
          parentBgIndex={2}
          isBgBar={true}
        />
      </div>
    </main>
  </div>
{/if}
