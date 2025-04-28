<script lang="ts">
  import { type INode } from "$lib/client/products/memotron/node/node.type";
  import type { ICollectionThumb } from "$lib/client/components/collection/collection.type";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import LinkSearchResultItem from "./LinkSearchResultItem.svelte";
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  export let item: INode | ICollectionThumb | IGoalThumb;
  export let isHideResourceType: boolean = false;
  export let resourceType: Resource;
  //   TODO - same case as Collection.svelte and Task.svelte - resulting in `undefined` after build
</script>

<LinkSearchResultItem {item} {isHideResourceType} {resourceType} />
