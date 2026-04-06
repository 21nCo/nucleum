<script lang="ts">
  import { taskStore } from "@21n/components/tasks/task.store";
  import { onMount } from "svelte";
  import type { IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { NodeType } from "@21n/products/memotron/node/node.type";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import TaskThumbnail from "@21n/components/tasks/TaskThumbnail.svelte";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type { IEmbedBlock } from "@21n/components/markdown/md.type";
  import type { IRecordId } from "@21n/types/data.type";

  let {
    node = null
  }: {
    node?: IActiveNodeStore | null;
  } = $props();
  let tasks: ITaskThumb[] = [];
  let isRefreshing = false;

  onMount(() => {
    refresh();
  });

  async function refresh() {
    if (!node || !$node?.md?.blocks) return;
    isRefreshing = true;
    const taskIds = $node.md.blocks
      .filter(
        (b): b is IEmbedBlock =>
          b.contentType === NodeType.EMBED &&
          typeof b.body === "object" &&
          b.body !== null &&
          "subType" in b.body &&
          b.body.subType === NodeType.TASK_AS_EMBED &&
          "id" in b.body
      )
      .map((b) => b.body.id)
      .filter((id): id is IRecordId => Boolean(id));
    const tasksResult = await taskStore.selectMany(
      {
        filters: {
          id: taskIds
        }
      },
      {
        isExpand: true
      }
    );
    if (isValidArrayWithData(tasksResult)) {
      tasks = [...tasksResult];
    }
    isRefreshing = false;
  }
</script>

{#if tasks.length > 0}
  {#each tasks as task}
    <TaskThumbnail item={task} />
  {/each}
{:else}
  <EmptyStatusView
    isLoadingState={isRefreshing}
    loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
    mainText="No tasks found"
    subText="This page doesn't have any tasks yet"
  />
{/if}
