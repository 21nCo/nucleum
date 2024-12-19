<script lang="ts">
  import {
    NodeType,
    webNodeTypeList,
    type INode
  } from "$lib/client/products/memotron/node/node.type";
  import WebNodeContent from "./WebNodeContent.svelte";
  import PdfAnnotator from "$lib/client/products/memotron/pdfAnnotator/PdfAnnotator.svelte";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import AudioContent from "../../audio/AudioContent.svelte";
  import { onMount } from "svelte";
  import type { IFile } from "$lib/client/components/files/file.type";
  import { fileStore } from "$lib/client/components/files/file.store";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { formatBytes } from "$lib/shared/utils/text.utils";
  import { createEventDispatcher } from "svelte";
  import { hoverable } from "$lib/client/actions/hover.action";
  const dispatch = createEventDispatcher();

  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let isHidePreview: boolean = false;
  export let renderingDetails: any = undefined;
  let pdfContent: any;
  let webContentRef: any;
  let _file: IFile;
  let _url: string;
  let isHovering: boolean = false;
  onMount(() => {
    resolveData();
  });

  export function onTraceClick(details: any) {
    if (node.contentType === NodeType.PDF) {
      pdfContent.scrollToAnnot(details.id, details.pageNumber);
    } else if (node.contentType === NodeType.YOUTUBE_VIDEO) {
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

  function resolveFileIcon() {
    if (!_file) return;
    if (_file.type.includes("zip") || _file.label?.endsWith(".zip"))
      return "ph:file-zip-light";
    if (
      _file.type.includes("excel") ||
      _file.label?.endsWith(".xlsx") ||
      _file.label?.endsWith(".xls")
    )
      return "ph:file-xls-light";
    if (
      _file.type.includes("word") ||
      _file.label?.endsWith(".docx") ||
      _file.label?.endsWith(".doc")
    )
      return "ph:file-doc-light";
    if (_file.type.includes("powerpoint") || _file.label?.endsWith(".pptx"))
      return "ph:file-ppt-light";

    if (_file.type.includes("csv") || _file.label?.endsWith(".csv"))
      return "ph:file-csv-light";

    if (_file.type.includes("html") || _file.label?.endsWith(".html"))
      return "ph:file-html-light";

    if (_file.type.includes("text") || _file.label?.endsWith(".txt"))
      return "ph:file-txt-light";

    return "ph:file-light";
  }
</script>

{#if _file && (node.contentType === NodeType.FILE || isHidePreview)}
  <button
    class="flex w-full h-full items-center justify-between p-3"
    use:hoverable={{
      onHover: (e) => {
        isHovering = e;
      }
    }}
  >
    <span class="flex items-center gap-2">
      <Icon icon={resolveFileIcon()} size={Size.xl} />
      <span class="text-sm">{_file.name ?? _file.label}</span>
      <span class="text-xs text-fgs4">
        {_file.size ? formatBytes(_file.size) : "Unknown size"}
      </span>
    </span>
    {#if isHovering}
      <span class="flex items-center gap-1">
        <Button
          icon="ph:download-simple-light"
          tooltip="Download file"
          on:click={() => {
            fileStore.download(_file);
          }}
        />
        <Button
          icon="ph:trash"
          tooltip="Delete file"
          on:click={() => {
            dispatch("delete");
          }}
        />
      </span>
    {/if}
  </button>
{:else if node.contentType === NodeType.AUDIO && _url}
  <!-- <audio controls src={$node.body?.url} /> -->
  <!-- TODO - relay refresh event to top instead of refreshing here -->
  <AudioContent
    on:refresh
    body={node?.body}
    url={_url}
    nodeId={node.id.toString()}
    {accessPoint}
  />
{:else if (node.contentType === NodeType.IMAGE || node.contentType === NodeType.VIDEO) && _file}
  <FileView file={_file} bind:renderingDetails class="!object-contain" />
{:else if webNodeTypeList.includes(node.contentType)}
  <WebNodeContent {node} bind:this={webContentRef} {accessPoint} />
{:else if node.contentType === NodeType.PDF && _url}
  <PdfAnnotator
    bind:this={pdfContent}
    url={_url}
    {node}
    {accessPoint}
    on:annotation
  />
{/if}
