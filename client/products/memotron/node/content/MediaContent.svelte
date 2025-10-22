<script lang="ts">
  import {
    NodeRightPaneType,
    NodeType,
    webNodeTypeList
  } from "@21n/products/memotron/node/node.type";
  import { type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  import MediaNodeRightPane from "@21n/products/memotron/node/rightPanel/MediaNodeRightPane.svelte";
  import { setContext } from "svelte";
  import view from "@21n/stores/view.store";
  import MediaContentResolver from "@21n/products/memotron/node/content/MediaContentResolver.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { isRecordId } from "@21n/components/flux/resourceStores/resource.utils";
  import context from "@21n/stores/context.store";
  import { OperatingSystem } from "@21n/types/context.type";

  export let node: IActiveNodeStore;
  export let isConstrainedWidth: boolean = false;
  export let rightPane: NodeRightPaneType | undefined =
    $node?.contentType === NodeType.PDF && !isConstrainedWidth
      ? NodeRightPaneType.BOOKMARKS
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

  function onConfigUpdate(e: CustomEvent<any>) {
    if ($node.contentType === NodeType.PDF && e.detail?.config)
      node.modify({
        config: {
          ...($node.config ?? {}),
          ...e.detail.config
        }
      });
  }
</script>

<div class="flex w-full flex-grow cw:mb-8 tp:otop:pt-12">
  {#if !(isConstrainedWidth && rightPane)}
    <main
      class={cn("relative flex w-full justify-center flex-1", {
        "h-full": $node.accessMode === ResourceAccessMode.FULL,
        "border-r border-brs2":
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
        on:configUpdate={onConfigUpdate}
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
