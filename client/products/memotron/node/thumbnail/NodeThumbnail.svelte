<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    type INode,
    NodeType,
    type INodeThumbnail
  } from "$lib/client/products/memotron/node/node.type";
  import NodeThumbnailInList from "./NodeThumbnailInList.svelte";
  import NodeThumbnailInTimeline from "./NodeThumbnailInTimeline.svelte";
  import { resolveContentPreview } from "$lib/client/products/memotron/node/node.utils";
  import {
    formatDate,
    formatDatetime,
    formatTime
  } from "$lib/client/utils/time.utils";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../common/thumbnail/ResourceThumbnailBase.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnailTitle from "./NodeThumbnailTitle.svelte";
  import ResourceThumbnailContentTypeOverlay from "../../common/thumbnail/ResourceThumbnailContentTypeOverlay.svelte";
  import { Placement } from "$lib/client/types/placement.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { lazyLoad } from "$lib/client/utils/browser.utils";
  import { isValidString } from "$lib/shared/utils/text.utils";
  export let item: INode;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let collectionContext: "board" | "default" | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let parentBgIndex = 1;
  let isHovering: boolean = false;
  let isGridBottomHovering = false;
  function resolvePreviewImageSrc(item: INode) {
    if (item.contentType === NodeType.IMAGE) return item.body.url;
    else if (item.contentType === NodeType.WEB_SCREENSHOT_CLIP)
      return item.body.s3URL;
    else if (
      item.contentType === NodeType.WEB_PAGE &&
      (item.metadata?.ogImage || item.metadata?.screenshotUrl)
    ) {
      return isValidString(item.metadata?.ogImage)
        ? item.metadata?.ogImage
        : item.metadata.screenshotUrl;
    }
    return undefined;
  }
</script>

<ResourceThumbnailBase
  {item}
  {accessPoint}
  {isApplyCustomColor}
  {arrangement}
  bind:isHovering
>
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
      <NodeThumbnailTitle node={item} />
    </button>
  {:else if arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY}
    {@const contentPreview = resolveContentPreview(
      item.body,
      item.contentType,
      item.metadata
    )}
    {@const previewImageSrc = resolvePreviewImageSrc(item)}
    <ResourceGridThumbnail
      {item}
      on:click
      {isApplyCustomColor}
      size={accessPoint === ResourceAccessPoint.BROWSER ? Size.sm : Size.md}
    >
      <div class="relative grow w-full p-4">
        <!-- Preview content -->
        {#if item.contentType === NodeType.IMAGE || item.contentType === NodeType.WEB_SCREENSHOT_CLIP || (item.contentType === NodeType.WEB_PAGE && previewImageSrc) || contentPreview.includes("https://")}
          <img
            alt="..."
            class={cn(
              "absolute inset-0 w-full rounded-t-md object-cover h-full"
            )}
            use:lazyLoad={previewImageSrc ?? contentPreview}
          />
        {:else if "body" in item && item.body}
          <span class="text-left text-b2">
            {contentPreview}
          </span>
        {/if}
        <!-- <ResourceThumbnailContentTypeOverlay
          contentType={item.contentType}
          placement={Placement.BOTTOM_RIGHT}
        /> -->
      </div>
      <slot slot="bottom" name="bottom">
        <HoverableElement
          bind:isHovering={isGridBottomHovering}
          class="flex  w-full h-5"
        >
          {#if isHovering && "url" in item.body && item.body.url}
            <a
              href={item.body.url}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 text-b3 text-fgs3 w-full hover:text-aps1"
              on:click={(e) => {
                e.stopPropagation();
              }}
            >
              <Icon
                icon="arrow-up-right"
                size={Size.xs}
                class={cn({
                  "fill-fgs3": !isGridBottomHovering,
                  "fill-aps1": isGridBottomHovering
                })}
              />
              <span class="truncate w-full text-left">
                {item.body.url}
              </span>
            </a>
          {:else}
            <NodeThumbnailTitle node={item} />
          {/if}
        </HoverableElement>

        <!-- <span class="text-b3 text-fgs3">
      {formatDatetime($userPreferences, new Date(node.createdAt))}
      </span> -->
      </slot>
    </ResourceGridThumbnail>
  {:else if arrangement === Arrangement.TIMELINE}
    <NodeThumbnailInTimeline node={item} on:click {parentBgIndex} />
  {/if}
</ResourceThumbnailBase>
