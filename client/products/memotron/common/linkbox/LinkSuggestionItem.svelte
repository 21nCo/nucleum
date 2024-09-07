<script lang="ts">
  import Breadcrumb from "$lib/client/elements/breadcrumb/Breadcrumb.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { determineResourceType } from "$lib/client/components/resourceStores/resource.utils";
  import { properCase } from "$lib/shared/utils/text.utils";
  import NodeThumbnailTitle from "../../node/thumbnail/NodeThumbnailTitle.svelte";
  export let item: any;
  export let isActive: boolean = false;

  let parentHierarchy: any[] = [];
  $: resourceType = determineResourceType(item.id);
</script>

<button
  class={cn("flex w-full justify-between items-center", {
    "h-12": parentHierarchy.length > 0,
    "h-8": parentHierarchy.length == 0
  })}
  on:click
>
  <span class="flex flex-col h-full mo:w-4/5 w-3/4">
    {#if parentHierarchy.length > 0}
      <div>
        <Breadcrumb
          items={parentHierarchy.map((x) => {
            return {
              label: x.label ?? x.body
            };
          })}
        />
      </div>
    {/if}
    <div class="flex gap-2 w-full">
      <NodeThumbnailTitle node={item} />
    </div>
  </span>
  <span class="text-b3 text-fgs3">{properCase(resourceType)}</span>
</button>
