<script lang="ts">
  import {
    NodeRightPaneType,
    NodeType,
    webNodeTypeList
  } from "$lib/client/products/memotron/node/node.type";
  import { type IActiveNodeStore } from "../node.store";
  import AudioScrubablePreview from "../../capture/AudioScrubablePreview.svelte";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import WebNodeContent from "./WebNodeContent.svelte";
  import MediaNodeRightPane from "../rightPanel/MediaNodeRightPane.svelte";
  import PdfAnnotator from "$lib/client/products/memotron/pdfAnnotator/PdfAnnotatorCaseChange.svelte";
  import { setContext } from "svelte";
  import FileView from "$lib/client/components/files/FileView.svelte";

  export let node: IActiveNodeStore;
  export let rightPane: NodeRightPaneType | undefined =
    $node?.contentType === NodeType.PDF ? NodeRightPaneType.TRACES : undefined;
  let pdfContent: any;
  let renderingDetails: any;
  let imgRef: HTMLImageElement;
  let isPortrait = true;

  $: if (imgRef) {
    isPortrait = imgRef.naturalHeight > imgRef.naturalWidth;
    renderingDetails = {
      originalHeight: imgRef.naturalHeight,
      originalWidth: imgRef.naturalWidth,
      renderedHeight: imgRef.clientHeight,
      renderedWidth: imgRef.clientWidth
    };
  }

  function contextEventListener(event: string, data: any) {
    if (event === "pdf-trace-click") {
      pdfContent.scrollToAnnot(data.id, data.pageNumber);
    }
  }
  const contentContext = {
    publish: contextEventListener
  };
  setContext("content", contentContext);
</script>

<div class="flex w-full flex-grow">
  <main
    class={cn(
      "relative flex w-full justify-center flex-1 border-r border-brs3",
      {
        "h-full": $node.accessMode === ResourceAccessMode.FULL,
        grow:
          $node.accessMode === ResourceAccessMode.POP ||
          $node.accessMode === ResourceAccessMode.INLINE
      }
    )}
  >
    {#if $node?.contentType === NodeType.AUDIO && $node.file?.url}
      <!-- <audio controls src={$node.body?.url} /> -->
      <!-- TODO - relay refresh event to top instead of refreshing here -->
      <AudioScrubablePreview
        on:refresh
        body={$node?.body}
        url={$node.file.url}
        nodeId={$node.id.toString()}
      />
    {:else if ($node?.contentType === NodeType.IMAGE || $node?.contentType === NodeType.VIDEO) && $node.file}
      <FileView file={$node.file} />
    {:else if webNodeTypeList.includes($node?.contentType)}
      <WebNodeContent node={$node} />
    {:else if $node?.contentType === NodeType.PDF && $node.file?.url}
      <PdfAnnotator
        bind:this={pdfContent}
        url={$node.file.url}
        bind:annots={$node.pdfAnnotations}
      />
    {/if}
  </main>
  {#if rightPane || webNodeTypeList.includes($node?.contentType)}
    <MediaNodeRightPane {node} bind:pane={rightPane} {renderingDetails} />
  {/if}
</div>
