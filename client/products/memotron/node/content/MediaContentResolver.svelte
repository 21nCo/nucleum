<script lang="ts">
  import {
    type IAudioBody,
    type IClip,
    type IWebPage,
    NodeType,
    webNodeTypeList,
    type INode
  } from "@21n/products/memotron/node/node.type";
  import WebNodeContent from "@21n/products/memotron/node/content/WebNodeContent.svelte";
  import PdfAnnotator from "@21n/products/memotron/pdfAnnotator/PdfAnnotator.svelte";
  import FileView from "@21n/components/files/FileView.svelte";
  import AudioContent from "@21n/products/memotron/audio/AudioContent.svelte";
  import { onMount } from "svelte";
  import type { IFile } from "@21n/components/files/file.type";
  import { fileStore } from "@21n/components/files/file.store";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { formatBytes } from "@21n/shared-utils/text.utils";
  import { resolveFileIcon } from "@21n/products/memotron/node/node.utils";

  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let isHidePreview: boolean = false;
  export let renderingDetails: any = undefined;
  let pdfContent: any;
  let webContentRef: any;
  let _file: IFile;
  let _url: string;
  onMount(() => {
    resolveData();
  });

  export function onTraceClick(details: any) {
    if (node.contentType === NodeType.PDF) {
      pdfContent.scrollToAnnot(details.id, details.pageNumber);
    } else if (
      node.contentType === NodeType.YOUTUBE_VIDEO ||
      node.contentType === NodeType.YOUTUBE_SHORT
    ) {
      webContentRef.onTrace(details);
    }
  }

  async function resolveData() {
    if (!node.file) return;
    const result = await fileStore.refresh(node.file);
    if (!result) return;
    _file = result;
    _url = _file.url ?? "";
  }

  function resolveAudioBody(body: INode["body"]) {
    return typeof body === "object" && body ? (body as IAudioBody) : undefined;
  }

  function resolveWebNode(node: INode) {
    return node as unknown as IClip | IWebPage;
  }
</script>

{#await resolveData()}
  <div class="flex w-full h-full items-center justify-center">
    <div
      class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"
    ></div>
  </div>
{:then}
  {#if _file && (node.contentType === NodeType.FILE || isHidePreview)}
    <button class="flex w-full items-center justify-between h-12">
      <span class="flex items-center gap-2">
        <Icon icon={resolveFileIcon(_file)} size={Size.lg} />
        <span class="text-sm">{_file.label}</span>
        <span class="text-xs text-fgs4">
          {_file.size ? formatBytes(_file.size) : "Unknown size"}
        </span>
      </span>
    </button>
  {:else if node.contentType === NodeType.AUDIO && _url}
    <!-- <audio controls src={$node.body?.url} /> -->
    <!-- TODO - relay refresh event to top instead of refreshing here -->
    <AudioContent
      on:refresh
      body={resolveAudioBody(node.body)}
      url={_url}
      nodeId={node.id.toString()}
      metadata={node.metadata}
      {accessPoint}
    />
  {:else if (node.contentType === NodeType.IMAGE || node.contentType === NodeType.VIDEO) && _file}
    <FileView file={_file} bind:renderingDetails class="!object-contain" />
  {:else if webNodeTypeList.includes(node.contentType)}
    <WebNodeContent
      node={resolveWebNode(node)}
      bind:this={webContentRef}
      {accessPoint}
    />
  {:else if node.contentType === NodeType.PDF && _url}
    <PdfAnnotator
      bind:this={pdfContent}
      url={_url}
      {node}
      {accessPoint}
      on:annotation
      on:configUpdate
    />
  {/if}
{/await}
