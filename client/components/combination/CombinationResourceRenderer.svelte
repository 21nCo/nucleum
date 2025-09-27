<script lang="ts">
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import Collection from "$lib/client/components/collection/Collection.svelte";
  import Node from "$lib/client/products/memotron/node/Node.svelte";
  import SideNavCombination from "./SideNavCombination.svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { IRecordId } from "$lib/client/types/data.type";

  export let resourceId: IRecordId | undefined = undefined;
  export let resourceType: Resource | undefined = undefined;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.INLINE;
  export let visitedCombinationIds: Set<string> = new Set();
  export let parentCombinationId: IRecordId | undefined = undefined;

  const unsupportedMessage = "Selected resource type is not yet supported";

  $: isRecursiveLoop =
    resourceType === Resource.combination &&
    resourceId &&
    visitedCombinationIds.has(resourceId.toString());

  function resolveVisitedIds() {
    if (resourceType !== Resource.combination || !resourceId) return visitedCombinationIds;
    const next = new Set(visitedCombinationIds);
    next.add(resourceId.toString());
    if (parentCombinationId) next.add(parentCombinationId.toString());
    return next;
  }
</script>

{#if !resourceId || !resourceType}
  <EmptyStatusView
    mainText="Pick a resource from the side nav"
    subText="Select an item to start reading"
    isSearchContext={false}
  />
{:else if isRecursiveLoop}
  <EmptyStatusView
    mainText="Recursive combination detected"
    subText="This combination references itself. Choose a different item."
    isSearchContext={false}
  />
{:else if resourceType === Resource.node}
  <Node id={resourceId} accessMode={accessMode} />
{:else if resourceType === Resource.collection}
  <Collection
    id={resourceId}
    accessMode={accessMode}
    accessPoint={ResourceAccessPoint.COMBINATION}
  />
{:else if resourceType === Resource.combination}
  <SideNavCombination
    id={resourceId}
    accessMode={accessMode}
    isEmbedded={true}
    visitedCombinationIds={resolveVisitedIds()}
  />
{:else}
  <EmptyStatusView mainText={unsupportedMessage} isSearchContext={false} />
{/if}
