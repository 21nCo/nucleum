<script lang="ts">
  import {
    NodeRightPaneType,
    NodeType,
    webNodeTypeList
  } from "$lib/client/products/memotron/node/node.type";
  import { type IActiveNodeStore } from "../node.store";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import MediaNodeRightPane from "../rightPanel/MediaNodeRightPane.svelte";
  import { setContext } from "svelte";
  import view from "$lib/client/stores/view.store";
  import MediaContentResolver from "./MediaContentResolver.svelte";

  export let node: IActiveNodeStore;
  export let rightPane: NodeRightPaneType | undefined =
    $node?.contentType === NodeType.PDF && !$view.isConstrainedWidth
      ? NodeRightPaneType.TRACES
      : undefined;
  let renderingDetails: any;
  let imgRef: HTMLImageElement;
  let contentRef: MediaContentResolver;
  let isPortrait = true;
  $: isConstrainedWidth =
    $view.isConstrainedWidth ||
    $node.accessMode === ResourceAccessMode.SPLIT ||
    $node.accessMode === ResourceAccessMode.FSPLIT;

  //TODO - renderingDetails realying to wherever necessary
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
    if (event === "pdf-trace-click" || event === "yt-trace-click") {
      contentRef.onTraceClick(data);
    }
  }
  const contentContext = {
    publish: contextEventListener
  };
  setContext("content", contentContext);
</script>

<div class="flex w-full flex-grow">
  {#if !(isConstrainedWidth && rightPane)}
    <main
      class={cn("relative flex w-full justify-center flex-1", {
        "h-full": $node.accessMode === ResourceAccessMode.FULL,
        "border-r border-brs3":
          rightPane ||
          (webNodeTypeList.includes($node?.contentType) && !isConstrainedWidth),
        grow:
          $node.accessMode === ResourceAccessMode.POP ||
          $node.accessMode === ResourceAccessMode.INLINE
      })}
    >
      <MediaContentResolver
        bind:node={$node}
        on:refresh
        bind:this={contentRef}
      />
    </main>
  {/if}
  {#if rightPane || (webNodeTypeList.includes($node?.contentType) && !isConstrainedWidth)}
    <MediaNodeRightPane {node} bind:pane={rightPane} {renderingDetails} />
  {/if}
</div>
