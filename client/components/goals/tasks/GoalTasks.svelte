<script lang="ts">
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { onMount } from "svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import TaskLibrary from "@21n/components/tasks/TaskLibrary.svelte";
  import { page } from "$app/stores";
  import { appStore } from "@21n/stores/app.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import Task from "@21n/components/tasks/Task.svelte";
  import Divider from "@21n/elements/Divider.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import view from "@21n/stores/view.store";
  import context from "@21n/stores/context.store";

  export let id: IRecordId;
  export let isActiveResource: boolean = true;
  let selectedTaskId: IRecordId | undefined = undefined;
  onMount(() => {
    const pageSub = page.subscribe(() => {
      const taskId = resolveTaskIdParam();
      if (taskId) {
        selectedTaskId = taskId;
      } else {
        selectedTaskId = undefined;
      }
    });
    return () => {
      pageSub();
    };
  });

  function resolveTaskIdParam() {
    return $page.url.searchParams.get(
      appStore.resolveRecordSpecificSearchParam(id, "task")
    );
  }
</script>

{#if !isActiveResource}
  <div class="flex w-full pt-2 pb-4 justify-center">
    <InlineInfoBanner
      content="You can't add tasks to this goal when it is archived/deleted/inactive."
      icon="warning"
    />
  </div>
{/if}
<div class="flex h-full w-full gap-3">
  <TaskLibrary
    goalId={id}
    isPreventAddNew={!isActiveResource}
    accessPoint={ResourceAccessPoint.GOAL}
  />
  {#if !$view.isPortrait && !$context.isTouchDevice}
    <Divider orientation={Orientation.Vertical} />
    <div class="w-1/2 min-w-96 h-full">
      {#if selectedTaskId}
        <Task
          id={selectedTaskId}
          accessPointId={id}
          accessPoint={ResourceAccessPoint.GOAL}
          accessMode={ResourceAccessMode.INLINE}
        />
      {:else}
        <EmptyStatusView
          mainText="No task selected"
          subText="Select a task to view it here."
        />
      {/if}
    </div>
  {/if}
</div>
