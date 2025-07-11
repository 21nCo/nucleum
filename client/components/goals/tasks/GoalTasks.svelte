<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "../../flux/resourceStores/resource.type";
  import TaskLibrary from "../../tasks/TaskLibrary.svelte";
  import { page } from "$app/stores";
  import { appStore } from "$lib/client/stores/app.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Task from "../../tasks/Task.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import view from "$lib/client/stores/view.store";

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
      icon="ph:warning-light"
    />
  </div>
{/if}
<div class="flex h-full w-full gap-3">
  <TaskLibrary
    goalId={id}
    isPreventAddNew={!isActiveResource}
    accessPoint={ResourceAccessPoint.GOAL}
  />
  {#if !$view.isConstrainedWidth}
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
