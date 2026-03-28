<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import {
    headingNodeTypes,
    type INode,
    type INodeThumb,
    NodeType,
    socialPostNodeTypeList,
    socialProfileNodeTypeList,
    socialProfileWithImageUnavailable
  } from "@21n/products/memotron/node/node.type";
  import {
    resolveContentPreview,
    resolveFilePreview,
    resolveIfImageShouldContain,
    resolveUrlPreview
  } from "@21n/products/memotron/node/node.utils";
  import ResourceGridThumbnail from "@21n/components/record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "@21n/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import NodeThumbnailTitle from "@21n/products/memotron/node/thumbnail/NodeThumbnailTitle.svelte";
  import TextClipPreview from "@21n/products/memotron/node/content/web/TextClipPreview.svelte";
  import FileView from "@21n/components/files/FileView.svelte";
  import {
    formatDatetime,
    formatSeconds,
    formatTime
  } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import NodeThumbnailAudioPreview from "@21n/products/memotron/node/thumbnail/NodeThumbnailAudioPreview.svelte";
  import NodeThumbnailPdfPreview from "@21n/products/memotron/node/thumbnail/NodeThumbnailPdfPreview.svelte";
  import { TimeFormat } from "@21n/types/time.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { fileStore } from "@21n/components/files/file.store";
  import type { IFile } from "@21n/components/files/file.type";
  import { onMount } from "svelte";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import NodeThumbnailProperties from "@21n/products/memotron/node/thumbnail/NodeThumbnailProperties.svelte";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import { enumToString, isValidString } from "@21n/shared-utils/text.utils";
  import ImagePreview from "@21n/products/memotron/node/content/ImagePreview.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import NodeThumbnailTwitterProfilePreview from "@21n/products/memotron/node/thumbnail/NodeThumbnailTwitterProfilePreview.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import NodeThumbnailSocialPostPreview from "@21n/products/memotron/node/thumbnail/NodeThumbnailSocialPostPreview.svelte";
  import CoverRenderer from "@21n/elements/coverPicker/CoverRenderer.svelte";
  export let item: INode | INodeThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let isHidePreview: boolean = false;
  export let isHideTitle: boolean = false;
  export let visibleProps: IProperty[] = [];
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointContext: string | undefined = undefined;
  export let accessPointId: IRecordId;
  export let collectionContext: "board" | "default" | undefined = undefined;
  export let isApplyCustomColor: boolean = false;
  export let parentBgIndex = 1;
  export let isDraggable: boolean = false;
  export let refreshId: number = new Date().getTime();
  export let isAlwaysShowContextMenuOnTouchDevice: boolean = false;

  let isHovering: boolean = false;
  let _url: string;
  let filePreview: IFile | IRecordId | undefined;
  let hasFullFileDetails = false;
  let resolvedFilePreview: IFile | undefined;
  let resolvedFilePreviewId: IRecordId | undefined;
  let youtubeTimestamp: number | undefined;
  $: void size;
  $: void collectionContext;
  $: void parentBgIndex;
  $: filePreview = resolveFilePreview(item);
  $: hasFullFileDetails =
    !!filePreview && typeof filePreview === "object";
  $: resolvedFilePreview = hasFullFileDetails
    ? (filePreview as IFile)
    : undefined;
  $: resolvedFilePreviewId =
    typeof filePreview === "string" ? filePreview : undefined;
  $: urlPreview = resolveUrlPreview(item);
  $: contentPreview = resolveContentPreview(item);
  $: youtubeTimestamp =
    item.contentType === NodeType.YOUTUBE_BOOKMARK &&
    item.body &&
    typeof item.body !== "string" &&
    "timestamp" in item.body &&
    typeof item.body.timestamp === "number"
      ? item.body.timestamp
      : undefined;
  $: isTextClip =
    item.contentType === NodeType.WEB_TEXT_BOOKMARK ||
    item.contentType === NodeType.KINDLE_HIGHLIGHT;
  $: isFullExpand =
    isTextClip ||
    socialPostNodeTypeList.has(item.contentType) ||
    (accessPoint === ResourceAccessPoint.NODE_TRACES &&
      item.contentType !== NodeType.YOUTUBE_BOOKMARK);
  $: isShouldContainImage = resolveIfImageShouldContain(item.contentType);

  $: isLinkContext =
    accessPoint === ResourceAccessPoint.NODE_LINKS ||
    accessPoint === ResourceAccessPoint.DEFAULT_RIGHT_PANE_LINKS;

  $: socialFallbackText =
    socialPostNodeTypeList.has(item.contentType) &&
    !isValidString(contentPreview)
      ? `Unknown ${enumToString(item.contentType)}`
      : undefined;

  $: socialPreviewText = socialPostNodeTypeList.has(item.contentType)
    ? isValidString(contentPreview)
      ? contentPreview
      : socialFallbackText
    : undefined;

  onMount(async () => {
    await resolveUrl();
  });

  async function resolveUrl() {
    if (item?.file) {
      const result = await fileStore.refresh(item.file);
      if (result) _url = result.url ?? "";
    }
  }

  function onNodeChange(e: any) {
    const data = e.detail?.params?.record;
    if (data) {
      item = { ...item, ...data };
      refreshId = new Date().getTime();
    }
  }
</script>

<ResourceThumbnailBase
  bind:item
  {accessPoint}
  {accessPointId}
  {accessPointContext}
  {isDraggable}
  {isApplyCustomColor}
  {arrangement}
  {isHidePreview}
  {isAlwaysShowContextMenuOnTouchDevice}
  bind:isHovering
  on:action
>
  {#if arrangement === Arrangement.LIST}
    <div
      class={cn("relative flex flex-col w-full border rounded-md truncate", {
        "bg-ccs5 notouch:hover:bg-ccs4 active:bg-ccs4 border-ccs2":
          isApplyCustomColor,
        "border-transparent notouch:hover:border-brs3 active:border-brs3 px-1":
          !isApplyCustomColor,
        "bg-bgs2 px-2":
          !isApplyCustomColor &&
          (accessPoint === ResourceAccessPoint.LIBRARY || isLinkContext),
        "pb-2": isLinkContext,
        "pt-2": isLinkContext && (isFullExpand || filePreview || urlPreview)
      })}
    >
      <button
        class={cn(
          "flex w-full items-center border- rounded--md truncate",
          !isFullExpand && {
            "h-16":
              (!isLinkContext || isFullExpand) &&
              (!visibleProps || visibleProps.length === 0)
            // "bg-ccs5 hover:bg-ccs4 border-ccs2": isApplyCustomColor,
            // "bg-bgs2 border-brs3 hover:border-fgs4": !isApplyCustomColor
          }
        )}
        on:click
      >
        {#if item.cover || item.previewImage || (item.contentType !== NodeType.NODULAR_MARKDOWN && !headingNodeTypes.includes(item.contentType))}
          <div
            class={cn(
              {
                "w-full h-full flex justify-start": isFullExpand
              },
              !isFullExpand && {
                "min-w-10 w-1/10 max-w-1/10": true,
                "h-10": !visibleProps || visibleProps.length === 0,
                "border-r": !isLinkContext && isApplyCustomColor,
                "border-ccs2": isApplyCustomColor
                // "border-brs3": !isApplyCustomColor
              }
            )}
          >
            {#if item.bodySearch}
              {@html renderMdAsHtml(item.bodySearch)}
            {:else if filePreview}
              <FileView
                file={resolvedFilePreview}
                id={resolvedFilePreviewId}
                isHideControls={true}
                isLazyLoad={true}
                isUseThumbnailIfAvailable={true}
                class={cn("object-cover h-full w-full rounded-md", {
                  // "rounded-md": isLinkContext,
                  // "rounded-full": !isLinkContext
                })}
              />
            {:else if item.cover}
              <CoverRenderer
                cover={item.cover}
                class={cn("object-cover h-full w-full rounded-md")}
              />
            {:else if urlPreview}
              <ImagePreview
                src={urlPreview}
                {arrangement}
                class={cn("object-cover h-full w-full rounded-md", {
                  // "rounded-md": isLinkContext
                })}
              />
            {:else if item.contentType === NodeType.AUDIO && _url}
              <span class="w-full h-full overflow-clip">
                <NodeThumbnailAudioPreview url={_url} />
              </span>
              <!-- {:else if item.contentType === NodeType.PDF && _url}
              <span class="w-full h-full overflow-clip relative z-0">
                <NodeThumbnailPdfPreview url={_url} />
              </span> -->
            {:else}
              <div
                class={cn("h-full text-wrap text-left text-b3 overflow-clip", {
                  "p-1 min-h-12":
                    !isLinkContext && (contentPreview || socialPreviewText)
                })}
              >
                {#if socialPreviewText}
                  <NodeThumbnailSocialPostPreview
                    text={socialPreviewText}
                    {accessPoint}
                    contentType={item.contentType}
                  />
                {:else if isTextClip && contentPreview}
                  <TextClipPreview
                    node={item}
                    {contentPreview}
                    {accessPoint}
                    {arrangement}
                  />
                {:else if contentPreview}
                  <span class="text-fgs3 userdata">
                    {@html renderMdAsHtml(contentPreview)}
                  </span>
                {:else}
                  <div
                    class="flex justify-center items-center bg-bgs2 w-full h-full rounded-md"
                  >
                    <Icon icon="file" class="text-fgs3" />
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
        {#if !isFullExpand}
          <div class="flex flex-col gap-2 items-start p-2">
            {#key refreshId}
              <NodeThumbnailTitle
                node={item}
                isUrlOnIcon={true}
                {accessPoint}
              />
            {/key}
            {#if !isLinkContext}
              <div class="text-b4 text-fgs3">
                {#if accessPoint === ResourceAccessPoint.CALENDAR}
                  {formatTime($userPreferences, item.createdAt)}
                {:else}
                  {formatDatetime($userPreferences, item.createdAt)}
                {/if}
              </div>
            {/if}
            {#if visibleProps.length > 0 && !isLinkContext}
              <div class="py-1">
                <NodeThumbnailProperties
                  values={item.properties}
                  properties={visibleProps}
                  nodeId={item.id}
                  {accessPoint}
                />
              </div>
            {/if}
          </div>
        {/if}
      </button>
      {#if item.contentType === NodeType.YOUTUBE_BOOKMARK && accessPoint === ResourceAccessPoint.NODE_TRACES}
        <span
          class={cn(
            "absolute bottom-3 left-3 bg-bgs2 rounded-md px-1 py-0.5 text-b2"
          )}
          style=""
        >
          {formatSeconds(youtubeTimestamp ?? 0, TimeFormat.CLOCK)}
        </span>
      {/if}
      <slot name="bottom" />
    </div>
  {:else if arrangement === Arrangement.GRID}
    <ResourceGridThumbnail
      {item}
      on:click
      {isHidePreview}
      {isApplyCustomColor}
      size={accessPoint === ResourceAccessPoint.BROWSER ? Size.sm : Size.md}
    >
      {#if !isHidePreview}
        <div class="relative flex-1 min-h-0 w-full pt-3 px-3">
          {#if item.bodySearch}
            <span class="text-b2 text-fgs2">
              {@html renderMdAsHtml(item.bodySearch)}
            </span>
          {:else if item.cover}
            <CoverRenderer
              cover={item.cover}
              class="absolute inset-0 w-full rounded-t-md object-cover h-full"
            />
          {:else if filePreview}
            <FileView
              file={resolvedFilePreview}
              id={resolvedFilePreviewId}
              isLazyLoad={true}
              isHideControls={true}
              isUseThumbnailIfAvailable={true}
              isApplyBgColor={false}
              class="absolute inset-0 w-full rounded-t-md object-cover h-full"
            />
          {:else if urlPreview && socialProfileNodeTypeList.has(item.contentType) && !socialProfileWithImageUnavailable.has(item.contentType)}
            <NodeThumbnailTwitterProfilePreview src={urlPreview} />
          {:else if urlPreview}
            <ImagePreview
              src={urlPreview}
              {arrangement}
              isApplyBgColor={isShouldContainImage}
              class={cn("absolute inset-0 w-full h-full", {
                "object-contain": isShouldContainImage,
                "rounded-t-md object-cover": !isShouldContainImage
              })}
            />
          {:else if item.contentType === NodeType.PDF && _url}
            <NodeThumbnailPdfPreview url={_url} />
          {:else}
            <div class="h-full overflow-clip text-b2">
              {#if isTextClip && contentPreview}
                <TextClipPreview
                  node={item}
                  {contentPreview}
                  {accessPoint}
                  {arrangement}
                />
              {:else if item.contentType === NodeType.AUDIO && _url}
                <NodeThumbnailAudioPreview url={_url} />
              {:else if contentPreview}
                <div class="text-fgs3 text-left userdata">
                  {@html renderMdAsHtml(contentPreview)}
                </div>
              {/if}
            </div>
          {/if}
          {#if !filePreview && contentPreview && !socialProfileNodeTypeList.has(item.contentType)}
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
        </div>
      {/if}
      <div slot="bottom" class="flex flex-col w-full h--5">
        {#key refreshId}
          <NodeThumbnailTitle node={item} />
        {/key}
        {#if visibleProps.length > 0}
          <div class="py-1">
            <NodeThumbnailProperties
              values={item.properties}
              properties={visibleProps}
              nodeId={item.id}
              {accessPoint}
            />
          </div>
        {/if}
      </div>
    </ResourceGridThumbnail>
  {:else if arrangement === Arrangement.MASONRY}
    {#if item.cover}
      <CoverRenderer
        cover={item.cover}
        class="absolute inset-0 w-full rounded-t-md object-cover h-full"
      />
    {:else if filePreview}
      <FileView
        file={resolvedFilePreview}
        id={resolvedFilePreviewId}
        isHideControls={true}
        isLazyLoad={true}
        isUseThumbnailIfAvailable={true}
        class={cn("w-full h-auto", {
          "rounded-md": isHideTitle,
          "rounded-t-md": !isHideTitle
        })}
        on:load
      />
    {:else if urlPreview && socialProfileNodeTypeList.has(item.contentType) && !socialProfileWithImageUnavailable.has(item.contentType)}
      <div class="relative h-20">
        <NodeThumbnailTwitterProfilePreview src={urlPreview} />
      </div>
    {:else if urlPreview}
      <ImagePreview
        src={urlPreview}
        {arrangement}
        on:load
        class={cn("w-full h-auto", {
          "rounded-md": isHideTitle,
          "rounded-t-md": !isHideTitle
        })}
      />
    {:else if item.contentType === NodeType.AUDIO && _url}
      <div class="overflow-clip text-wrap h-32 w-full flex">
        <NodeThumbnailAudioPreview url={_url} />
      </div>
    {:else if item.contentType === NodeType.PDF && _url}
      <span class="w-full h-80 overflow-clip relative z-0">
        <NodeThumbnailPdfPreview url={_url} />
      </span>
    {:else if contentPreview}
      <div
        class="h-auto p-2 overflow-clip text-wrap max-h-48 text-left text-b3"
      >
        {#if isTextClip}
          <TextClipPreview
            node={item}
            {contentPreview}
            {accessPoint}
            {arrangement}
          />
        {:else if socialPostNodeTypeList.has(item.contentType)}
          <span class="text-fgs3">
            <NodeThumbnailSocialPostPreview
              text={contentPreview}
              {accessPoint}
              contentType={item.contentType}
              isFullExpand={true}
            />
          </span>
        {:else}
          <span class="text-fgs3 userdata">
            {#if item.contentType === NodeType.NODULAR_MARKDOWN}
              {@html renderMdAsHtml(contentPreview)}
            {:else}
              {contentPreview}
            {/if}
          </span>
        {/if}
      </div>
    {/if}
    {#if !isHideTitle || (!filePreview && !urlPreview && !_url && !isValidString(contentPreview))}
      <div class="flex flex-col flex-1 bg-bgs2">
        <div
          class={cn(
            "w-full bg-bgs2 rounded-b-md h-10 p-2 truncate text-b2 flex flex-1 items-center",
            {
              "rounded-md":
                !filePreview && !urlPreview && !_url && !contentPreview
            }
          )}
        >
          {#key refreshId}
            <NodeThumbnailTitle node={item} />
          {/key}
        </div>
        {#if visibleProps.length > 0}
          <div class="py-1">
            <NodeThumbnailProperties
              values={item.properties}
              properties={visibleProps}
              nodeId={item.id}
              {accessPoint}
            />
          </div>
        {/if}
      </div>
    {/if}
  {/if}
  <slot slot="right" name="right">
    <slot name="right" />
  </slot>
</ResourceThumbnailBase>

<ComponentBaseLayer subscribeToRecords={[item.id]} on:change={onNodeChange} />
