<script lang="ts">
  import MediaContentResolver from "@21n/products/memotron/node/content/MediaContentResolver.svelte";
  import {
    mediaNodeTypeList,
    NodeType,
    type INode,
    type INodeThumb
  } from "@21n/products/memotron/node/node.type";
  import { getContext, onMount, createEventDispatcher } from "svelte";
  import type { IEmbedBlockBody } from "@21n/components/markdown/md.type";
  import EmbedContentPlaceholder from "@21n/components/markdown/embed/EmbedContentPlaceholder.svelte";
  import { logger } from "@21n/components/debug/logger.client";
  import type { IRecordId } from "@21n/types/data.type";
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import YoutubeVideoPreview from "@21n/products/memotron/node/content/web/YoutubeVideoPreview.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Collection from "@21n/components/collection/Collection.svelte";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { resizable } from "@21n/actions/resize.action";
  import { appStore } from "@21n/stores/app.store";
  import NodeTitleLabelPart from "@21n/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import type { MdStoreType } from "@21n/components/markdown/markdown.store";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { formatBytes } from "@21n/shared-utils/text.utils";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { fileStore } from "@21n/components/files/file.store";
  import type { IFile } from "@21n/components/files/file.type";
  import { ErrorMessage } from "@21n/components/error/error.type";
  import { sanitizeAndResolve } from "@21n/products/memotron/node/url.utils";
  import { debouncer } from "@21n/utils/utils";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import view from "@21n/stores/view.store";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "@21n/products/memotron/capture/capture.store";
  import Task from "@21n/components/tasks/Task.svelte";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { Context } from "@21n/types/appStore.type";

  const dispatch = createEventDispatcher();
  const nodeContext = getContext<any>(Context.NODE);
  const captureContext = getContext<any>(Context.CAPTURE);
  let captureStore: IActiveCaptureStore | undefined;
  $: if (nodeContext?.id || captureContext?.id) {
    const id = nodeContext?.id
      ? nodeContext?.id + "capture"
      : captureContext?.id;
    captureStore = ActiveCaptureStore.resolve(id);
  }
  const contentContext = getContext<any>(Context.CONTENT);
  export let id: IRecordId;
  export let body: IEmbedBlockBody;
  export let mdStore: MdStoreType;
  export let isHovering = false;
  let embedResourceType: Resource | undefined;
  $: embedResourceType = body?.id ? determineResourceType(body.id) : undefined;

  let linkInputValue = "";
  let _mediaBlock: INode | undefined;
  let refreshId = new Date().getTime();
  let _mediaBlockFile: IFile | undefined;
  let height = body?.height ?? 300;
  let isLoading = true;
  let isEditingTitle = false;
  let titleInputValue = "";
  let titleInputRef: TextInput | undefined;

  const titleNotRequiredTypes = [NodeType.KINDLE_BOOK];
  const resizableTypes = [
    NodeType.IMAGE,
    NodeType.PDF,
    NodeType.WEB_PAGE,
    NodeType.WEB_SCREENSHOT,
    NodeType.YOUTUBE_VIDEO,
    NodeType.YOUTUBE_SHORT,
    NodeType.YOUTUBE_BOOKMARK,
    NodeType.GIST
  ];

  $: isResizable =
    (!$mdStore.params?.isReadOnly &&
      _mediaBlock?.contentType &&
      resizableTypes.includes(_mediaBlock?.contentType) &&
      !body?.isHidePreview) ??
    false;

  $: isShowTitle =
    _mediaBlock?.contentType &&
    !titleNotRequiredTypes.includes(_mediaBlock?.contentType);

  $: isShowPreview =
    _mediaBlock?.contentType &&
    !body?.isHidePreview &&
    _mediaBlock?.contentType !== NodeType.FILE;

  function onSelectFromLibrary(event: CustomEvent) {
    logger.debug({ at: "EmbedContent onSelectFromLibrary", event });
    if (!event.detail.id) return;
    const resource = determineResourceType(event.detail.id);
    if (resource === Resource.node) {
      _mediaBlock = event.detail;
      dispatchUpdateEvent({
        id: event.detail.id,
        subType: event.detail.contentType
      });
      contentContext.publish("mention", {
        location: id,
        item: event.detail
      });
    } else if (resource === Resource.collection) {
      dispatchUpdateEvent({
        id: event.detail.id,
        subType: NodeType.COLLECTION_AS_EMBED
      });
    } else if (resource === Resource.task) {
      dispatchUpdateEvent({
        id: event.detail.id,
        subType: NodeType.TASK_AS_EMBED
      });
    }
  }

  function dispatchUpdateEvent(body: Partial<IEmbedBlockBody>) {
    dispatch("update", body);
  }
  const debouncedDispatchUpdateEvent = debouncer(dispatchUpdateEvent, 500);

  onMount(async () => {
    try {
      isLoading = true;
      if (!body?.id) return;
      if (embedResourceType === Resource.node)
        await assignNodeMediaContent(body.id);
    } catch (e) {
      logger.error({ at: "EmbedContent onMount", e });
    } finally {
      isLoading = false;
    }
  });

  async function assignNodeMediaContent(id: IRecordId) {
    const node = await nodeStore.select(id, {
      expand: ["parent", "file"]
    });
    if (node) {
      _mediaBlock = node;
      _mediaBlockFile = node.file as IFile;
    }
  }

  async function onLinkInput() {
    try {
      isLoading = true;
      const sanitized = sanitizeAndResolve(linkInputValue);
      if (typeof sanitized === "string") {
        toasts.error("Invalid URL");
        return;
      }

      if (body?.subType && body.subType !== NodeType.UNKNOWN) {
        if (sanitized.contentType !== body.subType) {
          toasts.error(`Invalid URL. Expected ${body.subType} URL`);
          return;
        }
        dispatchUpdateEvent({ url: sanitized.url });
        return;
      }
      const result = await captureStore?.saveWebpage(sanitized.url, {
        contentType: sanitized.contentType,
        isEmbedContext: true,
        creationContext: nodeContext?.id ?? undefined
      });
      if (!result || !("id" in result)) return;
      dispatchUpdateEvent({ id: result.id, subType: sanitized.contentType });
      _mediaBlock = result;
    } catch (e) {
      logger.error({ at: "EmbedContent onLinkInput", e });
      toasts.error(ErrorMessage.DEFAULT);
    } finally {
      isLoading = false;
    }
  }

  function onResize(e: any) {
    height = e.height;
    debouncedDispatchUpdateEvent({ height });
  }

  function resolveEmbedTarget(target: EventTarget | null) {
    return target as HTMLElement | null;
  }

  function resolveNodeThumb(node: INode) {
    return node as unknown as INodeThumb;
  }

  function isYoutubeEmbedSubType(subType: NodeType | undefined) {
    return (
      subType === NodeType.YOUTUBE_VIDEO || subType === NodeType.YOUTUBE_SHORT
    );
  }

  function onEditTitle(e: MouseEvent) {
    if ($view.isConstrainedWidth) {
      if (body.id) appStore.openResource(body.id, AccessMode.POP);
      return;
    }
    e.stopPropagation();
    isEditingTitle = true;
    titleInputValue = _mediaBlock?.label ?? "";
    setTimeout(() => {
      titleInputRef?.focus();
    }, 100);
  }

  async function onNodeChange(e: any) {
    if (body.id) await assignNodeMediaContent(body.id);
    refreshId = new Date().getTime();
  }
</script>

{#if body.id && _mediaBlock && !isLoading}
  {#key refreshId}
    <button
      class={cn("flex flex-col w-full", {
        "pt-4": isShowTitle && isShowPreview,
        "py-2": !isShowTitle,
        "my-4": $view.isConstrainedWidth
      })}
      style={isResizable
        ? `min-height: ${height}px; height: ${height}px; max-height: ${height}px;`
        : ""}
      use:resizable={{
        enabled: !$context.isTouchDevice && isResizable && !isEditingTitle,
        minHeight: 300,
        maxHeight: 1600,
        edges: ["bottom"],
        onResize: onResize
      }}
      on:click={(e) => {
        if (resolveEmbedTarget(e.target)?.classList.contains("resizer")) return;
        if (_mediaBlock?.contentType === NodeType.FILE) return;
        if (body.id) appStore.openResource(body.id, AccessMode.POP);
      }}
    >
      {#if isShowPreview}
        <div
          class={cn("flex w-full", {
            // "min-h-[40rem] h-[40rem]": _mediaBlock.contentType === NodeType.PDF,
            "flex-grow justify-center": isResizable,
            "h-auto max-h-[20rem]":
              !isResizable &&
              ![NodeType.TWEET].includes(_mediaBlock?.contentType),
            "overflow-auto": _mediaBlock?.contentType === NodeType.GIST
          })}
        >
          <MediaContentResolver
            node={_mediaBlock}
            accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
            on:delete
          />
        </div>
      {/if}
      {#if isShowTitle}
        {#if isEditingTitle && !$mdStore.params?.isReadOnly}
          <button
            class="flex justify-center items-center w-full h-16 rounded-md"
            on:click|stopPropagation
          >
            <TextInput
              bind:value={titleInputValue}
              bind:this={titleInputRef}
              parentBackgroundIndex={2}
              placeholder="Title"
              width="w-full"
              size={Size.sm}
              on:save={() => {
                if (_mediaBlock) {
                  _mediaBlock.label = titleInputValue;
                  nodeStore.modify(_mediaBlock.id, { label: titleInputValue });
                }
                setTimeout(() => {
                  isEditingTitle = false;
                }, 100);
              }}
              on:cancel={() => {
                setTimeout(() => {
                  titleInputValue = _mediaBlock?.label ?? "";
                  isEditingTitle = false;
                }, 100);
              }}
              isShowSaveControl={true}
            />
          </button>
        {:else}
          <button
            class={cn(
              "flex w-full justify-between items-center gap-2 rounded-md",
              {
                "h-16 px-3": !isShowPreview,
                "bg-bgs2":
                  !isShowPreview &&
                  (!isHovering || $mdStore.params?.isReadOnly),
                "h-20": isShowPreview
              }
            )}
            on:click={onEditTitle}
          >
            <div
              class={cn("flex w-96 mo:w-full", {
                "flex-col gap-1": _mediaBlock?.url,
                "gap-2 items-center": _mediaBlockFile
              })}
            >
              <NodeTitleLabelPart
                item={resolveNodeThumb(_mediaBlock)}
                accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
              />
              {#if !isShowPreview && _mediaBlockFile}
                <span
                  class="text-left text-b4 text-fgs4 whitespace-nowrap shrink-0"
                >
                  {_mediaBlockFile.size
                    ? formatBytes(_mediaBlockFile.size)
                    : "Unknown size"}
                </span>
              {:else if !isShowPreview && _mediaBlock?.url}
                <button
                  class="text-xs text-left text-fgs4 whitespace-nowrap shrink-0 hover:underline"
                  on:click={(e) => {
                    if (_mediaBlock?.url) {
                      appStore.openLink(_mediaBlock.url);
                    }
                    e.stopPropagation();
                  }}
                >
                  {_mediaBlock.url.replace(/^https?:\/\//, "").split("?")[0]}
                </button>
              {/if}
            </div>
            {#if isHovering}
              <div class="flex gap-2 items-center shrink-0">
                {#if !$mdStore.params?.isReadOnly}
                  <Button
                    icon="edit"
                    tooltip="Edit title"
                    size={Size.sm}
                    style={ButtonStyle.OUTLINED}
                    on:click={onEditTitle}
                  />
                {/if}
                {#if _mediaBlock?.contentType !== NodeType.FILE}
                  <Button
                    icon="circle"
                    tooltip="Go to node"
                    size={Size.sm}
                    style={ButtonStyle.OUTLINED}
                    on:click={() => {
                      if (body.id)
                        appStore.openResource(body.id, AccessMode.POP);
                    }}
                  />
                {/if}
                {#if mediaNodeTypeList.includes(_mediaBlock?.contentType)}
                  <Button
                    icon="download"
                    tooltip="Download"
                    size={Size.sm}
                    style={ButtonStyle.OUTLINED}
                    on:click={(e) => {
                      if (_mediaBlock?.file) {
                        fileStore.download(_mediaBlock.file);
                      }
                      e.stopPropagation();
                    }}
                  />
                {/if}
                {#if _mediaBlock?.url}
                  <Button
                    icon="weblink"
                    tooltip="Go to external link"
                    size={Size.sm}
                    style={ButtonStyle.OUTLINED}
                    on:click={(e) => {
                      if (_mediaBlock?.url) {
                        appStore.openLink(_mediaBlock.url);
                      }
                      e.stopPropagation();
                    }}
                  />
                {/if}
                {#if !$mdStore.params?.isReadOnly}
                  <Button
                    icon="trash"
                    tooltip="Delete"
                    size={Size.sm}
                    type={ButtonVariant.DANGER}
                    style={ButtonStyle.OUTLINED}
                    on:click={() => {
                      dispatch("delete");
                    }}
                  />
                {/if}
              </div>
            {/if}
          </button>
        {/if}
      {/if}
    </button>
  {/key}
{:else if body?.url && isYoutubeEmbedSubType(body?.subType)}
  <YoutubeVideoPreview url={body.url} />
{:else if body?.subType === NodeType.COLLECTION_AS_EMBED && body?.id}
  <div class="h-96 w-[90vw] py-4 max-w-full overflow-x-auto">
    <Collection
      id={body.id}
      accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
      parentBgIndex={$context.embed === Embed.HANDSET ? 2 : 1}
    />
  </div>
{:else if body?.subType === NodeType.TASK_AS_EMBED && body?.id}
  {#key body.id.toString()}
    <div class="h-fit min-h-20 w-full py-4 max-w-full overflow-x-auto">
      <Task id={body.id} accessPoint={ResourceAccessPoint.MARKDOWN_EMBED} />
    </div>
  {/key}
{:else if isLoading}
  <div class="flex items-center justify-center w-full h-80 bg-bgs2">
    <Icon icon="svg-spinners:3-dots-fade" size={Size.xl} />
  </div>
{:else}
  <EmbedContentPlaceholder
    subType={body?.subType && body.subType !== NodeType.UNKNOWN
      ? body.subType
      : undefined}
    bind:linkInputValue
    on:select={onSelectFromLibrary}
    on:linkInput={onLinkInput}
  />
{/if}
{#if body?.id && embedResourceType === Resource.node}
  <ComponentBaseLayer subscribeToRecords={[body.id]} on:change={onNodeChange} />
{/if}
