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
  import { copyToClipboard } from "$lib/client/utils/utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { formatBytes } from "$lib/shared/utils/text.utils";

  export let node: INode;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
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
    } else if (node.contentType === NodeType.YOUTUBE_VIDEO) {
      webContentRef.onTrace(details);
    }
  }

  async function resolveData() {
    if (
      (typeof node.file === "object" && "tb" in node.file) ||
      typeof node.file === "string"
    ) {
      _file = await fileStore.select(node.file);
    } else if (typeof node.file === "object") {
      _file = node.file;
    }
    if (!_file) return;
    _url =
      _file.url ??
      URL.createObjectURL(new Blob([_file.data], { type: _file.type }));
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

{#if node.contentType === NodeType.AUDIO && _url}
  <!-- <audio controls src={$node.body?.url} /> -->
  <!-- TODO - relay refresh event to top instead of refreshing here -->
  <AudioContent
    on:refresh
    body={node?.body}
    url={_url}
    nodeId={node.id.toString()}
  />
{:else if (node.contentType === NodeType.IMAGE || node.contentType === NodeType.VIDEO) && _file}
  <FileView file={_file} class="!object-contain" />
{:else if webNodeTypeList.includes(node.contentType)}
  <WebNodeContent {node} bind:this={webContentRef} {accessPoint} />
{:else if node.contentType === NodeType.PDF && _url}
  <PdfAnnotator
    bind:this={pdfContent}
    url={_url}
    {node}
    {accessPoint}
    bind:annots={node.pdfAnnotations}
  />
{:else if node.contentType === NodeType.FILE && _file}
  <button class="flex w-full h-full items-center justify-between p-3">
    <span class="flex items-center gap-2">
      <Icon icon={resolveFileIcon()} size={Size.xl} />
      <span class="text-sm">{_file.name ?? _file.label}</span>
      <span class="text-xs text-fgs4">
        {_file.size ? formatBytes(_file.size) : "Unknown size"}
      </span>
    </span>
    <Button
      icon="ph:download-light"
      tooltip="Download file"
      on:click={() => {
        //TODO - download from url
      }}
    />
  </button>
{/if}
