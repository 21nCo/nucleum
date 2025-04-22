<script lang="ts">
  import MediaContentResolver from "$lib/client/products/memotron/node/content/MediaContentResolver.svelte";
  import {
    mediaNodeTypeList,
    NodeType,
    type INode
  } from "$lib/client/products/memotron/node/node.type";
  import { getContext, onMount, createEventDispatcher } from "svelte";
  import type { IEmbedBlockBody } from "../md.type";
  import EmbedContentPlaceholder from "./EmbedContentPlaceholder.svelte";
  import { logger } from "../../debug/logger.client";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "../../flux/resourceStores/resource.type";
  import YoutubeVideoPreview from "$lib/client/products/memotron/node/content/web/YoutubeVideoPreview.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import Collection from "$lib/client/components/collection/Collection.svelte";
  import { determineResourceType } from "../../flux/resourceStores/resource.utils";
  import { resizable } from "$lib/client/actions/resize.action";
  import { appStore } from "$lib/client/stores/app.store";
  import NodeTitleLabelPart from "$lib/client/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { MdStoreType } from "../markdown.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { toasts } from "$lib/client/stores/notification.store";
  import { formatBytes } from "$lib/shared/utils/text.utils";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { fileStore } from "../../files/file.store";
  import type { IFile } from "../../files/file.type";
  import { ErrorMessage } from "../../error/error.type";
  import { sanitizeAndResolve } from "$lib/client/products/memotron/node/url.utils";
  import { debouncer } from "$lib/client/utils/utils";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import view from "$lib/client/stores/view.store";
  import {
    ActiveCaptureStore,
    type IActiveCaptureStore
  } from "$lib/client/products/memotron/capture/capture.store";
  import Task from "../../tasks/Task.svelte";

  const dispatch = createEventDispatcher();
  const nodeContext = getContext<any>("node");
  let captureStore: IActiveCaptureStore | undefined;
  $: if (nodeContext?.id) {
    captureStore = ActiveCaptureStore.resolve(nodeContext?.id + "capture");
  }
  const contentContext = getContext<any>("content");
  export let id: IRecordId;
  export let body: IEmbedBlockBody;
  export let mdStore: MdStoreType;
  export let isHovering = false;

  let linkInputValue = "";
  let _mediaBlock: INode | undefined;
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
    NodeType.WEB_SCREENSHOT_CLIP,
    NodeType.YOUTUBE_VIDEO,
    NodeType.YOUTUBE_TIMESTAMP_CLIP,
    NodeType.GIST
  ];

  $: isResizable =
    (_mediaBlock?.contentType &&
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
      const resource = determineResourceType(body.id);
      if (resource === Resource.node) await assignNodeMediaContent(body.id);
    } catch (e) {
      logger.error({ at: "EmbedContent onMount", e });
    } finally {
      isLoading = false;
    }
  });

  async function assignNodeMediaContent(id: IRecordId) {
    const node = await nodeStore.select(id, [
      "*",
      "parent.* as parent",
      "file.* as file"
    ]);
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
      if (!result) return;
      dispatchUpdateEvent({ id: result[0].id, subType: sanitized.contentType });
      _mediaBlock = result[0];
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

  function onEditTitle(e: MouseEvent) {
    if ($view.isConstrainedWidth) {
      if (body.id) appStore.openResource(body.id, ResourceAccessMode.POP);
      return;
    }
    e.stopPropagation();
    isEditingTitle = true;
    titleInputValue = _mediaBlock?.label ?? "";
    setTimeout(() => {
      titleInputRef?.focus();
    }, 100);
  }
</script>

{#if body.id && _mediaBlock && !isLoading}
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
      if (e.target && e.target.classList.contains("resizer")) return;
      if (_mediaBlock?.contentType === NodeType.FILE) return;
      if (body.id) appStore.openResource(body.id, ResourceAccessMode.POP);
    }}
  >
    {#if isShowPreview}
      <div
        class={cn("flex w-full", {
          // "min-h-[40rem] h-[40rem]": _mediaBlock.contentType === NodeType.PDF,
          "flex-grow justify-center": isResizable,
          "h-auto max-h-[20rem]": !isResizable,
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
              "bg-bgs2": !isShowPreview && !isHovering,
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
              item={_mediaBlock}
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
              <Button
                icon="ph:pencil-simple-light"
                tooltip="Edit title"
                size={Size.sm}
                style={ButtonStyle.OUTLINED}
                on:click={(e) => {
                  onEditTitle(e.detail);
                }}
              />
              {#if _mediaBlock?.contentType !== NodeType.FILE}
                <Button
                  icon="ph:circle-light"
                  tooltip="Go to node"
                  size={Size.sm}
                  style={ButtonStyle.OUTLINED}
                  on:click={() => {
                    if (body.id)
                      appStore.openResource(body.id, ResourceAccessMode.POP);
                  }}
                />
              {/if}
              {#if mediaNodeTypeList.includes(_mediaBlock?.contentType)}
                <Button
                  icon="ph:download-simple-light"
                  tooltip="Download"
                  size={Size.sm}
                  style={ButtonStyle.OUTLINED}
                  on:click={(e) => {
                    if (_mediaBlock?.file) {
                      fileStore.download(_mediaBlock.file);
                    }
                    e.detail.stopPropagation();
                  }}
                />
              {/if}
              {#if _mediaBlock?.url}
                <Button
                  icon="ph:arrow-up-right-light"
                  tooltip="Go to external link"
                  size={Size.sm}
                  style={ButtonStyle.OUTLINED}
                  on:click={(e) => {
                    if (_mediaBlock?.url) {
                      appStore.openLink(_mediaBlock.url);
                    }
                    e.detail.stopPropagation();
                  }}
                />
              {/if}
              <Button
                icon="ph:trash-light"
                tooltip="Delete"
                size={Size.sm}
                type={ButtonVariant.DANGER}
                style={ButtonStyle.OUTLINED}
                on:click={() => {
                  dispatch("delete");
                }}
              />
            </div>
          {/if}
        </button>
      {/if}
    {/if}
  </button>
{:else if body?.url && body?.subType === NodeType.YOUTUBE_VIDEO}
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
