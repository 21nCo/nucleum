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
  import { appStore } from "$lib/client/stores/app.store";
  import { isRecordId } from "$lib/client/components/flux/resourceStores/resource.utils";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";

  export let node: IActiveNodeStore;
  export let isConstrainedWidth: boolean = false;
  export let rightPane: NodeRightPaneType | undefined =
    $node?.contentType === NodeType.PDF && !isConstrainedWidth
      ? NodeRightPaneType.TRACES
      : undefined;
  let renderingDetails: any;
  let contentRef: MediaContentResolver;

  function contextEventListener(event: string, data: any) {
    if (event === "pdf-trace-click" || event === "yt-trace-click") {
      if ($view.isPortrait && isRecordId(data.id)) {
        appStore.openResource(data.id, ResourceAccessMode.POP);
      } else {
        contentRef.onTraceClick(data);
      }
    }
  }
  const contentContext = {
    publish: contextEventListener
  };
  setContext("content", contentContext);

  function onAnnotation(e: CustomEvent<any[]>) {
    if ($node.contentType === NodeType.PDF && e.detail)
      $node.pdfAnnotations = e.detail;
  }
</script>

<div class="flex w-full flex-grow cw:mb-8 tp:embed-ios:pt-12">
  {#if !(isConstrainedWidth && rightPane)}
    <main
      class={cn("relative flex w-full justify-center flex-1", {
        "h-full": $node.accessMode === ResourceAccessMode.FULL,
        "border-r border-brs3":
          rightPane ||
          (webNodeTypeList.includes($node?.contentType) && !isConstrainedWidth),
        grow:
          $node.accessMode === ResourceAccessMode.POP ||
          $node.accessMode === ResourceAccessMode.INLINE,
        "mt-16":
          $context.isEmbed &&
          $context.os === OperatingSystem.IOS &&
          $node.contentType === NodeType.VIDEO
      })}
    >
      <MediaContentResolver
        node={$node}
        on:refresh
        bind:this={contentRef}
        bind:renderingDetails
        on:annotation={onAnnotation}
      />
    </main>
  {/if}
  {#if rightPane || (webNodeTypeList.includes($node?.contentType) && !isConstrainedWidth)}
    <MediaNodeRightPane
      {node}
      bind:pane={rightPane}
      {renderingDetails}
      {isConstrainedWidth}
    />
  {/if}
</div>
