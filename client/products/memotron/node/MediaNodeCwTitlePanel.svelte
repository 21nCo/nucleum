<script lang="ts">
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  import { type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import NodeTitle from "@21n/products/memotron/node/title/NodeTitle.svelte";
  import ResourceStatusBanner from "@21n/components/record/RecordStatusBanner.svelte";
  import CollectionsLane from "@21n/products/memotron/node/floatingBar/CollectionsLane.svelte";
  import { isShowStatusBanner } from "@21n/components/flux/resourceStores/resource.utils";
  export let node: IActiveNodeStore;
</script>

<div
  class={cn("flex flex-col w-full justify-center items-center", {
    "mb-6 absolute z-10 bottom-0":
      $node.accessMode === ResourceAccessMode.SLIDESHOW,
    relative: $node.accessMode !== ResourceAccessMode.SLIDESHOW
  })}
>
  <div
    class={cn("flex flex-col gap-3 justify-center items-center", {
      "w-full": $node.accessMode !== ResourceAccessMode.SLIDESHOW,
      "mo:w-full w-9/10 max-w-9/10 2k:w-[80rem] rounded-md":
        $node.accessMode === ResourceAccessMode.SLIDESHOW
    })}
  >
    {#if isShowStatusBanner($node)}
      <div
        class={cn("rounded-md border border-brs2 shadow-md", {
          "absolute z-10 bottom-full mb-2 w-[98%]":
            $node.accessMode === ResourceAccessMode.POP ||
            $node.accessMode === ResourceAccessMode.INLINE,
          "w-full": $node.accessMode === ResourceAccessMode.FULL
        })}
      >
        <ResourceStatusBanner resource={node} />
      </div>
    {/if}
    <div
      class={cn(
        "flex flex-col gap-2 w-full justify-center items-center bg-bgs1 mo:p-2 p-3 cw:border-b cw:border-b-brs2 cw:border-t-transparent cw:rounded-none cw:bg-bgs2 cw:otop:pt-12 border-t border-t-brs2",
        {
          "rounded-b-md": $node.accessMode === ResourceAccessMode.POP,
          "w-full": $node.accessMode !== ResourceAccessMode.SLIDESHOW,
          "rounded-md shadow-md":
            $node.accessMode === ResourceAccessMode.SLIDESHOW
        }
      )}
    >
      <div class="flex gap-3 justify-between items-center w-full">
        <span class="flex items-center gap-4 flex-1 min-w-0">
          <NodeTitle
            node={$node}
            on:labelChange={(e) => {
              if ($node.label !== undefined)
                node.modify({ label: $node.label });
            }}
            on:editModeChange={(e) => {
              node.toggleEditMode(e.detail);
            }}
          />
        </span>
      </div>
      <div class="flex w-full justify-between">
        <CollectionsLane {node} />
      </div>
    </div>
  </div>
</div>
