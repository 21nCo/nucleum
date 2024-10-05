<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    type INodeThumb,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { resolveContentPreview } from "$lib/client/products/memotron/node/node.utils";
  import {
    formatDate,
    formatDatetime,
    formatTime
  } from "$lib/client/utils/time.utils";
  import ResourceGridThumbnail from "../../common/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../common/thumbnail/ResourceThumbnailBase.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnailTitle from "./NodeThumbnailTitle.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import TextClipPreview from "../content/web/TextClipPreview.svelte";
  import { lazyLoad } from "$lib/client/actions/lazyload.action";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  export let item: INodeThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let collectionContext: "board" | "default" | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let parentBgIndex = 1;
  export let isDraggable: boolean = false;
  let isHovering: boolean = false;
  let isGridBottomHovering = false;
  function resolvePreviewImageSrc(item: INodeThumb) {
    if (item.contentType === NodeType.IMAGE) return item.file;
    else if (
      item.contentType === NodeType.WEB_SCREENSHOT_CLIP ||
      item.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP
    )
      return item.body.file;
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
  {isDraggable}
  {isApplyCustomColor}
  {arrangement}
  bind:isHovering
>
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
    {@const contentPreview = resolveContentPreview(item)}
    {@const previewImageSrc = resolvePreviewImageSrc(item)}
    {@const isImagePreview =
      item.contentType === NodeType.IMAGE ||
      item.contentType === NodeType.WEB_SCREENSHOT_CLIP ||
      item.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP ||
      (item.contentType === NodeType.WEB_PAGE && previewImageSrc) ||
      contentPreview.includes("https://")}
    <ResourceGridThumbnail
      {item}
      isMasonry={arrangement === Arrangement.MASONRY}
      on:click
      {isApplyCustomColor}
      size={accessPoint === ResourceAccessPoint.BROWSER ? Size.sm : Size.md}
    >
      <div class="relative flex-1 min-h-0 w-full pt-3 px-3">
        <!-- Preview content -->
        {#if isImagePreview}
          {#if previewImageSrc?.id}
            <FileView
              file={previewImageSrc}
              class="absolute inset-0 w-full rounded-t-md object-cover h-full"
            />
          {:else}
            <img
              alt="..."
              class={cn(
                "absolute inset-0 w-full rounded-t-md object-cover h-full"
              )}
              use:lazyLoad={previewImageSrc ?? contentPreview}
            />
          {/if}
        {:else if contentPreview && (item.contentType === NodeType.TEXT_CLIP || item.contentType === NodeType.KINDLE_HIGHLIGHT)}
          <TextClipPreview node={item} {contentPreview} />
        {:else if contentPreview}
          <div class="h-full overflow-clip">
            {contentPreview}
          </div>
        {/if}
        {#if !isImagePreview}
          <span
            class={cn(
              "absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent",
              {
                "via-bgs1/5 to-bgs1": !isApplyCustomColor,
                "via-ccs5 to-ccs5": isApplyCustomColor
              }
            )}
            style=""
          >
          </span>
        {/if}
        <!-- <ResourceThumbnailContentTypeOverlay
          contentType={item.contentType}
          placement={Placement.BOTTOM_RIGHT}
        /> -->
      </div>

      <div
        slot="bottom"
        class="flex w-full h-5"
        use:hoverable
        on:hover={(e) => (isGridBottomHovering = e.detail)}
      >
        {#if isHovering && item.body && typeof item.body === "object" && "url" in item.body && item.body.url}
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
      </div>

      <!-- <span class="text-b3 text-fgs3">
      {formatDatetime($userPreferences, new Date(node.createdAt))}
      </span> -->
    </ResourceGridThumbnail>
  {/if}
</ResourceThumbnailBase>
