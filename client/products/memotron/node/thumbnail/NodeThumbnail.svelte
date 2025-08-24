<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import {
    headingNodeTypes,
    type INodeThumb,
    NodeType,
    socialPostNodeTypeList,
    socialProfileNodeTypeList,
    socialProfileWithImageUnavailable
  } from "$lib/client/products/memotron/node/node.type";
  import {
    resolveContentPreview,
    resolveFilePreview,
    resolveIfImageShouldContain,
    resolveUrlPreview
  } from "$lib/client/products/memotron/node/node.utils";
  import ResourceGridThumbnail from "../../../../components/record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../../../components/record/thumbnail/ResourceThumbnailBase.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import NodeThumbnailTitle from "./NodeThumbnailTitle.svelte";
  import TextClipPreview from "../content/web/TextClipPreview.svelte";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import {
    formatDatetime,
    formatSeconds,
    formatTime
  } from "$lib/client/utils/time.utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import NodeThumbnailAudioPreview from "./NodeThumbnailAudioPreview.svelte";
  import NodeThumbnailPdfPreview from "./NodeThumbnailPdfPreview.svelte";
  import { TimeFormat } from "$lib/client/types/time.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { fileStore } from "$lib/client/components/files/file.store";
  import { onMount } from "svelte";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import NodeThumbnailProperties from "./NodeThumbnailProperties.svelte";
  import type { IProperty } from "$lib/client/components/collection/properties/property.type";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import ImagePreview from "../content/ImagePreview.svelte";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import NodeThumbnailTwitterProfilePreview from "./NodeThumbnailTwitterProfilePreview.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import NodeThumbnailSocialPostPreview from "./NodeThumbnailSocialPostPreview.svelte";
  export let item: INodeThumb;
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
  $: filePreview = resolveFilePreview(item);
  $: hasFullFileDetails = filePreview?.url || filePreview?.data;
  $: urlPreview = resolveUrlPreview(item);
  $: contentPreview = resolveContentPreview(item);
  $: isTextClip =
    item.contentType === NodeType.TEXT_CLIP ||
    item.contentType === NodeType.KINDLE_HIGHLIGHT;
  $: isFullExpand =
    isTextClip ||
    item.contentType === NodeType.TWEET ||
    accessPoint === ResourceAccessPoint.NODE_TRACES;
  $: isShouldContainImage = resolveIfImageShouldContain(item.contentType);

  $: isLinkContext =
    accessPoint === ResourceAccessPoint.NODE_LINKS ||
    accessPoint === ResourceAccessPoint.DEFAULT_RIGHT_PANE_LINKS;

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
          (accessPoint === ResourceAccessPoint.LIBRARY ||
            accessPoint === ResourceAccessPoint.NODE_LINKS ||
            accessPoint === ResourceAccessPoint.DEFAULT_RIGHT_PANE_LINKS),
        "p-2": isLinkContext
      })}
    >
      <button
        class={cn(
          "flex w-full items-center border- rounded--md truncate",
          !isFullExpand && {
            "h-16": !visibleProps || visibleProps.length === 0
            // "bg-ccs5 hover:bg-ccs4 border-ccs2": isApplyCustomColor,
            // "bg-bgs2 border-brs3 hover:border-fgs4": !isApplyCustomColor
          }
        )}
        on:click
      >
        {#if item.contentType !== NodeType.NODULAR_MARKDOWN && !headingNodeTypes.includes(item.contentType)}
          <div
            class={cn(
              {
                "w-full h-full p-2 flex justify-start": isFullExpand
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
                file={hasFullFileDetails ? filePreview : undefined}
                id={hasFullFileDetails ? undefined : filePreview}
                isHideControls={true}
                isLazyLoad={true}
                isUseThumbnailIfAvailable={true}
                class={cn("object-cover h-full w-full rounded-md", {
                  // "rounded-md": isLinkContext,
                  // "rounded-full": !isLinkContext
                })}
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
                  "p-2": !isLinkContext && contentPreview
                })}
              >
                {#if socialPostNodeTypeList.has(item.contentType) && contentPreview}
                  <NodeThumbnailSocialPostPreview
                    text={contentPreview}
                    {accessPoint}
                    contentType={item.contentType}
                  />
                {:else if isTextClip && contentPreview}
                  <TextClipPreview node={item} {contentPreview} {accessPoint} />
                {:else if contentPreview}
                  <span class="text-fgs3 userdata">
                    {contentPreview}
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
            <div class="text-b4 text-fgs3 default-typeface">
              {#if accessPoint === ResourceAccessPoint.CALENDAR}
                {formatTime($userPreferences, item.createdAt)}
              {:else}
                {formatDatetime($userPreferences, item.createdAt)}
              {/if}
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
      </button>
      {#if item.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP && accessPoint === ResourceAccessPoint.NODE_TRACES}
        <span
          class={cn(
            "absolute bottom-3 left-3 bg-bgs2 rounded-md px-1 py-0.5 text-b2"
          )}
          style=""
        >
          {formatSeconds(item.body.timestamp, TimeFormat.CLOCK)}
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
          {:else if filePreview}
            <FileView
              file={hasFullFileDetails ? filePreview : undefined}
              id={hasFullFileDetails ? undefined : filePreview}
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
                <TextClipPreview node={item} {contentPreview} {accessPoint} />
              {:else if item.contentType === NodeType.AUDIO && _url}
                <NodeThumbnailAudioPreview url={_url} />
              {:else if contentPreview}
                <span class="text-fgs3 userdata">
                  {contentPreview}
                </span>
              {/if}
            </div>
          {/if}
          {#if contentPreview && !socialProfileNodeTypeList.has(item.contentType)}
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
    {#if filePreview}
      <FileView
        file={hasFullFileDetails ? filePreview : undefined}
        id={hasFullFileDetails ? undefined : filePreview}
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
          <TextClipPreview node={item} {contentPreview} {accessPoint} />
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
            {contentPreview}
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
