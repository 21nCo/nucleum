<script lang="ts">
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import Collection from "@nucleum/features/collections/Collection.svelte";
  import Node from "@nucleum/features/memory/node/Node.svelte";
  import Objective from "@nucleum/features/focus/goals/Goal.svelte";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";

  let {
    resourceId = undefined,
    resourceType = undefined
  }: {
    resourceId?: IRecordId | undefined;
    resourceType?: Resource | undefined;
  } = $props();
</script>

{#if !resourceId || !resourceType}
  <EmptyStatusView
    mainText="Pick an item from the side nav"
    subText="Pages, collections and goals open here"
    isSearchContext={false}
  />
{:else}
  {#key resourceId}
    {#if resourceType === Resource.node}
      <Node id={resourceId} />
    {:else if resourceType === Resource.collection}
      <Collection id={resourceId} accessPoint={ResourceAccessPoint.SPACE} />
    {:else if resourceType === Resource.objective}
      <Objective id={resourceId} accessPoint={ResourceAccessPoint.SPACE} />
    {:else}
      <EmptyStatusView
        mainText="This item cannot open here"
        isSearchContext={false}
      />
    {/if}
  {/key}
{/if}
