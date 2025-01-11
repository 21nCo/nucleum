<script lang="ts">
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { enumToString, properCase } from "$lib/shared/utils/text.utils";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  export let contentType: CollectionType | NodeType | undefined = undefined;
  export let placement: Placement = Placement.TopLeft;
</script>

{#if contentType}
  <div
    class={cn("absolute flex bg-bgs2 rounded-md px-2 py-1 m-2 text-b4", {
      "top-0 left-0": placement === Placement.TopLeft,
      "bottom-0 right-0": placement === Placement.BottomRight
    })}
  >
    {#if contentType === CollectionType.TYPED || contentType === CollectionType.QUERY}
      {properCase(contentType)} collection
    {:else if contentType !== CollectionType.UNTYPED && Object.values(NodeType).includes(contentType)}
      {properCase(enumToString(contentType))}
    {/if}
  </div>
{/if}
