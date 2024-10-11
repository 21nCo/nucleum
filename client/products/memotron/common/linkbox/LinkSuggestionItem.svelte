<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { determineResourceType } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import NodeThumbnailTitle from "../../node/thumbnail/NodeThumbnailTitle.svelte";
  import NodeTitleBreadcrumbs from "../../node/title/NodeTitleBreadcrumbs.svelte";
  import type { INode } from "../../node/node.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  export let item: INode;
  export let isActive: boolean = false;

  $: resourceType = determineResourceType(item.id);
</script>

<button
  class={cn("flex w-full justify-between items-center py-2 px-1 min-h-fit")}
  on:click
>
  <span class="flex flex-col h-full mo:w-4/5 w-3/4">
    <!-- TODO breadcrumbs - calling select for each result for parent resolution -->
    <!-- <NodeTitleBreadcrumbs node={item} on:click /> -->
    <div class="flex gap-2 w-full">
      <NodeThumbnailTitle
        node={item}
        accessPoint={ResourceAccessPoint.SEARCH_RESULT}
      />
    </div>
  </span>
  <span class="text-b3 text-fgs3">{properCase(resourceType)}</span>
</button>
