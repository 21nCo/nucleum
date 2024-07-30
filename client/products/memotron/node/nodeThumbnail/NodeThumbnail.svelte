<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { type INodeThumbnail } from "$lib/client/products/memotron/node/node.type";
  import NodeThumbnailInList from "./NodeThumbnailInList.svelte";
  import NodeThumbnailInTimeline from "./NodeThumbnailInTimeline.svelte";
  import { contentPreview } from "$lib/client/products/memotron/node/node.utils";
  import {
    formatDate,
    formatDatetime,
    formatTime
  } from "$lib/client/utils/time.utils";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../common/thumbnail/ResourceThumbnailBase.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import ResourceThumbnailTitle from "../../common/thumbnail/ResourceThumbnailTitle.svelte";
  export let item: INodeThumbnail;
  export let variant: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let context: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let collectionContext: "board" | "default" | undefined = undefined;
  export let parentBgIndex = 1;
</script>

<ResourceThumbnailBase {item} {context}>
  {#if variant === Arrangement.LIST && collectionContext}
    <NodeThumbnailInList node={item} {parentBgIndex} on:click />
  {:else if variant === Arrangement.LIST}
    <button class="flex w-full p-3 bg-bgs2 rounded-md" on:click>
      <ResourceThumbnailTitle {item} />
    </button>
  {:else if variant === Arrangement.GRID}
    <ResourceGridThumbnail {item} on:click>
      <div class="grow w-full p-4">
        <!-- Preview content -->
        {#if "body" in item && item.body}
          <span class="text-left text-b2">
            {contentPreview(item.body)}
          </span>
        {/if}
      </div>
      <slot slot="bottom" name="bottom">
        <!-- <span class="text-b3 text-fgs3">
      {formatDatetime($userPreferences, new Date(node.createdAt))}
      </span> -->
      </slot>
    </ResourceGridThumbnail>
  {:else if variant === Arrangement.TIMELINE}
    <NodeThumbnailInTimeline node={item} on:click {parentBgIndex} />
  {/if}
</ResourceThumbnailBase>
