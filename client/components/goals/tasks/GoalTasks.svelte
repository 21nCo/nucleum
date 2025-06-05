<script lang="ts">
  import InlineInfoBanner from "$lib/client/elements/text/InlineInfoBanner.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import TaskLibrary from "../../tasks/TaskLibrary.svelte";

  export let id: IRecordId;
  export let isActiveResource: boolean = true;
</script>

{#if !isActiveResource}
  <div class="flex w-full pt-2 pb-4 justify-center">
    <InlineInfoBanner
      content="You can't add tasks to this goal when it is archived/deleted/inactive."
      icon="ph:warning-light"
    />
  </div>
{/if}
<TaskLibrary
  goalId={id}
  isPreventAddNew={!isActiveResource}
  accessPoint={ResourceAccessPoint.GOAL}
/>
