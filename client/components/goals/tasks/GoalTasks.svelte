<script lang="ts">
  import InlineInfoBanner from "@21n/elements/text/InlineInfoBanner.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import TaskLibrary from "@21n/components/tasks/TaskLibrary.svelte";
  import type { IRecordId } from "@21n/types/data.type";

  let { id, isActiveResource = true }: {
    id: IRecordId;
    isActiveResource?: boolean;
  } = $props();
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
</div>
