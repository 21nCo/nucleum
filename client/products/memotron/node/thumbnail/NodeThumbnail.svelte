<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    NodeType,
    type INodeThumbnail
  } from "$lib/client/products/memotron/node/node.type";
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
  import { cn } from "$lib/client/utils/ui.utils";
  export let item: INodeThumbnail;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let collectionContext: "board" | "default" | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let parentBgIndex = 1;
</script>

<ResourceThumbnailBase {item} {accessPoint} {isApplyCustomColor}>
  <!-- {#if variant === Arrangement.LIST && collectionContext}
    <NodeThumbnailInList node={item} {parentBgIndex} on:click /> -->
  {#if arrangement === Arrangement.LIST}
    <button
      class={cn("flex w-full p-3 border rounded-md truncate", {
        "bg-ccs5 hover:bg-ccs4 border-ccs2": isApplyCustomColor,
        "bg-bgs2 border-brs3 hover:border-aps2": !isApplyCustomColor
      })}
      on:click
    >
      <ResourceThumbnailTitle {item} />
    </button>
  {:else if arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY}
    <ResourceGridThumbnail
      {item}
      on:click
      {isApplyCustomColor}
      size={accessPoint === ResourceAccessPoint.BROWSER ? Size.sm : Size.md}
    >
      <div class="relative grow w-full p-4">
        <!-- Preview content -->
        {#if item.contentType === NodeType.IMAGE}
          <img
            alt="..."
            class={cn(
              "absolute inset-0 w-full rounded-t-md object-cover h-full"
            )}
            src={item.body.url}
          />
        {:else if "body" in item && item.body}
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
  {:else if arrangement === Arrangement.TIMELINE}
    <NodeThumbnailInTimeline node={item} on:click {parentBgIndex} />
  {/if}
</ResourceThumbnailBase>
