<script lang="ts">
  import MediaContentResolver from "$lib/client/products/memotron/node/content/MediaContentResolver.svelte";
  import {
    NodeType,
    type INode
  } from "$lib/client/products/memotron/node/node.type";
  import { getContext, onMount } from "svelte";
  import type { MdStoreType } from "../markdown.store";
  import { BlockAction, type IBlock } from "../md.type";
  import EmbedContentPlaceholder from "./EmbedContentPlaceholder.svelte";
  import { logger } from "../../debug/logger.client";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import NodeTitle from "$lib/client/products/memotron/node/title/NodeTitle.svelte";
  import { ResourceAccessPoint } from "../../flux/resourceStores/resource.type";
  import YoutubeVideoPreview from "$lib/client/products/memotron/node/content/web/YoutubeVideoPreview.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resolveContentTypeForUrl } from "$lib/client/extensions/clipper/clipper.utils";
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import Collection from "$lib/client/products/memotron/collection/Collection.svelte";
  import { determineResourceType } from "../../flux/resourceStores/resource.utils";
  const nodeContext = getContext<any>("node");
  const blockContext = getContext<any>("block");
  export let block: IBlock;
  export let mdStore: MdStoreType;
  let linkInputValue = "";
  let _mediaBlock: INode | undefined;

  const titleNotRequiredTypes = [NodeType.FILE, NodeType.KINDLE_BOOK];

  /**
   * Relays an event to the block context.
   * @param event event name
   * @param data event data
   */
  function relay(event: BlockAction, data?: any) {
    if (!blockContext.publish) {
      logger.error({
        at: "EmbedContent relay",
        error: "No block context found",
        data
      });
      return;
    }
    blockContext.publish(event, data);
  }

  function onSelectFromLibrary(event: CustomEvent) {
    logger.debug({ at: "EmbedContent onSelectFromLibrary", event });
    if (!event.detail.id) return;
    const resource = determineResourceType(event.detail.id);
    if (resource === Resource.node) {
      _mediaBlock = event.detail;
      assignBody({ id: event.detail.id, subType: event.detail.contentType });
    } else if (resource === Resource.collection) {
      assignBody({
        id: event.detail.id,
        subType: NodeType.COLLECTION_AS_EMBED
      });
    }
  }
  function assignBody(body: any) {
    relay(BlockAction.CHANGE, {
      body
    });
    if (typeof block.body === "object") {
      block.body = {
        ...block.body,
        ...body
      };
    } else {
      block.body = { ...body };
    }
  }
  onMount(() => {
    if (!block.body?.id) return;
    const resource = determineResourceType(block.body.id);
    if (resource === Resource.node) assignNodeMediaContent(block.body.id);
  });

  async function assignNodeMediaContent(id: IRecordId) {
    const node = await nodeStore.select(id);
    if (node) _mediaBlock = node;
  }

  async function onLinkInput() {
    console.log({ at: "EmbedContent onLinkInput", linkInputValue });
    if (block.body?.subType) {
      //TODO - validation of url for the subType
      assignBody({ url: linkInputValue });
    } else {
      //TODO - determine subType from url
      const nodeType = resolveContentTypeForUrl(linkInputValue);
      console.log({ at: "EmbedContent onLinkInput", nodeType });
      if (nodeType === NodeType.WEB_PAGE) {
        const result = await captureStore.saveWebpage(linkInputValue, {
          isEmbedContext: true,
          creationContext: nodeContext?.id ?? undefined
        });
        if (!result) return;
        assignBody({ id: result[0].id, subType: nodeType });
        _mediaBlock = result[0];
      } else {
        assignBody({ subType: nodeType, url: linkInputValue });
      }
    }
  }

  // $: console.log({ at: "EmbedContent", ...block, _mediaBlock });
</script>

{#if block?.body?.id && _mediaBlock}
  <div class="flex flex-col gap-4 py-2">
    <div
      class={cn({
        "min-h-[40rem] h-[40rem]": _mediaBlock.contentType === NodeType.PDF,
        "h-auto": _mediaBlock.contentType !== NodeType.PDF
      })}
    >
      <MediaContentResolver
        node={_mediaBlock}
        accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
      />
    </div>
    {#if !titleNotRequiredTypes.includes(_mediaBlock.contentType)}
      <div class="w-full flex justify-center">
        <NodeTitle
          node={_mediaBlock}
          accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
        />
      </div>
    {/if}
  </div>
{:else if block?.body?.url && block?.body?.subType === NodeType.YOUTUBE_VIDEO}
  <YoutubeVideoPreview url={block.body.url} />
{:else if block?.body?.subType === NodeType.COLLECTION_AS_EMBED && block?.body?.id}
  <div class="w-full h-96">
    <Collection
      id={block.body.id}
      accessPoint={ResourceAccessPoint.MARKDOWN_EMBED}
    />
  </div>
{:else}
  <EmbedContentPlaceholder
    {block}
    {mdStore}
    bind:linkInputValue
    on:select={onSelectFromLibrary}
    on:linkInput={onLinkInput}
  />
{/if}
