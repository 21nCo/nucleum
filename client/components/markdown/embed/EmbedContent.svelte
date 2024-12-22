<script lang="ts">
  import MediaContentResolver from "$lib/client/products/memotron/node/content/MediaContentResolver.svelte";
  import {
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
  import { resolveContentTypeForUrl } from "$lib/client/extensions/clipper/clipper.utils";
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import Collection from "$lib/client/products/memotron/collection/Collection.svelte";
  import { determineResourceType } from "../../flux/resourceStores/resource.utils";
  import { resizable } from "$lib/client/actions/resize.action";
  import { appStore } from "$lib/client/stores/app.store";
  import NodeTitleLabelPart from "$lib/client/products/memotron/node/title/NodeTitleLabelPart.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { MdStoreType } from "../markdown.store";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  const dispatch = createEventDispatcher();
  const nodeContext = getContext<any>("node");
  const contentContext = getContext<any>("content");
  export let id: IRecordId;
  export let body: IEmbedBlockBody;
  export let mdStore: MdStoreType;

  let linkInputValue = "";
  let _mediaBlock: INode | undefined;
  let height = body?.height ?? 300;
  let isLoading = true;
  let isEditingTitle = false;
  let titleInputValue = "";
  let titleInputRef: TextInput | undefined;

  const titleNotRequiredTypes = [NodeType.FILE, NodeType.KINDLE_BOOK];
  const resizableTypes = [NodeType.IMAGE, NodeType.PDF];

  $: isResizable =
    (_mediaBlock?.contentType &&
      resizableTypes.includes(_mediaBlock?.contentType) &&
      !body?.isHidePreview) ??
    false;

  $: isShowTitle =
    _mediaBlock?.contentType &&
    !titleNotRequiredTypes.includes(_mediaBlock?.contentType) &&
    !body?.isHidePreview;

  function onSelectFromLibrary(event: CustomEvent) {
    logger.debug({ at: "EmbedContent onSelectFromLibrary", event });
    if (!event.detail.id) return;
    const resource = determineResourceType(event.detail.id);
    if (resource === Resource.node) {
      _mediaBlock = event.detail;
      mergeBody({ id: event.detail.id, subType: event.detail.contentType });
      contentContext.publish("mention", {
        location: id,
        item: event.detail
      });
    } else if (resource === Resource.collection) {
      mergeBody({
        id: event.detail.id,
        subType: NodeType.COLLECTION_AS_EMBED
      });
    }
  }
  function mergeBody(body: Partial<IEmbedBlockBody>) {
    dispatch("update", body);
  }
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
    const node = await nodeStore.select(id, ["*", "parent.* as parent"]);
    if (node) _mediaBlock = node;
  }

  async function onLinkInput() {
    if (body?.subType) {
      //TODO - validation of url for the subType
      mergeBody({ url: linkInputValue });
    } else {
      const nodeType = resolveContentTypeForUrl(linkInputValue);
      if (nodeType === NodeType.WEB_PAGE) {
        const result = await captureStore.saveWebpage(linkInputValue, {
          isEmbedContext: true,
          creationContext: nodeContext?.id ?? undefined
        });
        if (!result) return;
        mergeBody({ id: result[0].id, subType: nodeType });
        _mediaBlock = result[0];
      } else {
        mergeBody({ subType: nodeType, url: linkInputValue });
      }
    }
  }

  function onResize(e: any) {
    height = e.height;
    mergeBody({ height });
  }
</script>

{#if body.id && _mediaBlock && !isLoading}
  <button
    class={cn("flex flex-col gap-4 w-full", {
      "pt-2": isShowTitle,
      "py-2": !isShowTitle
    })}
    style={isResizable
      ? `min-height: ${height}px; height: ${height}px; max-height: ${height}px;`
      : ""}
    use:resizable={{
      enabled: isResizable && !isEditingTitle,
      minHeight: 300,
      maxHeight: 1600,
      edges: ["bottom"],
      onResize: onResize
    }}
    on:click={(e) => {
      if (e.target && e.target.classList.contains("resizer")) return;
      if (_mediaBlock?.contentType === NodeType.FILE) return;
      appStore.openResource(body.id, ResourceAccessMode.POP);
    }}
  >
    <div
      class={cn("flex w-full", {
        // "min-h-[40rem] h-[40rem]": _mediaBlock.contentType === NodeType.PDF,
        "h-4/5 justify-center": isResizable && !isEditingTitle,
        "h-7/10 justify-center": isEditingTitle,
        "h-auto max-h-[20rem]": !isResizable
      })}
    >
      <MediaContentResolver
        node={_mediaBlock}
        accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
        isHidePreview={body?.isHidePreview}
        on:delete
      />
    </div>
    {#if isShowTitle}
      {#if isEditingTitle && !$mdStore.params?.isReadOnly}
        <button on:click|stopPropagation>
          <TextInput
            bind:value={titleInputValue}
            bind:this={titleInputRef}
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
          class="w-full flex justify-center"
          on:click={(e) => {
            isEditingTitle = true;
            titleInputValue = _mediaBlock?.label ?? "";
            setTimeout(() => {
              titleInputRef?.focus();
            }, 100);
            e.stopPropagation();
          }}
        >
          <NodeTitleLabelPart
            item={_mediaBlock}
            accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
          />
        </button>
      {/if}
    {/if}
  </button>
{:else if body?.url && body?.subType === NodeType.YOUTUBE_VIDEO}
  <YoutubeVideoPreview url={body.url} />
{:else if body?.subType === NodeType.COLLECTION_AS_EMBED && body?.id}
  <div class="w-full h-96">
    <Collection id={body.id} accessPoint={ResourceAccessPoint.MARKDOWN_EMBED} />
  </div>
{:else if isLoading}
  <div
    class="flex items-center justify-center w-full h-80 bg-bgs2 bg-opacity-50"
  >
    <Icon icon="svg-spinners:3-dots-fade" size={Size.xl} />
  </div>
{:else}
  <EmbedContentPlaceholder
    subType={body?.subType}
    bind:linkInputValue
    on:select={onSelectFromLibrary}
    on:linkInput={onLinkInput}
  />
{/if}
