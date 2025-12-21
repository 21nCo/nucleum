<script lang="ts">
  import {
    NodeType,
    webNodeTypeList
  } from "@21n/products/memotron/node/node.type";
  import { ResourcePanelType } from "@21n/components/resource/resourcePanel.type";
  import { type IActiveNodeStore } from "@21n/products/memotron/node/node.store";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import { cn } from "@21n/utils/ui.utils";
  import MediaNodeRightPane from "@21n/products/memotron/node/rightPanel/MediaNodeRightPane.svelte";
  import { setContext } from "svelte";
  import view from "@21n/stores/view.store";
  import MediaContentResolver from "@21n/products/memotron/node/content/MediaContentResolver.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { isRecordId } from "@21n/components/flux/resourceStores/resource.utils";
  import context from "@21n/stores/context.store";
  import { OperatingSystem } from "@21n/types/context.type";
  import { Context } from "@21n/types/appStore.type";

  export let node: IActiveNodeStore;
  export let isConstrainedWidth: boolean = false;
  let renderingDetails: any;
  let contentRef: MediaContentResolver;

  function contextEventListener(event: string, data: any) {
    if (event === "pdf-trace-click" || event === "yt-trace-click") {
      if ($view.isPortrait && isRecordId(data.id)) {
        appStore.openResource(data.id, AccessMode.POP);
      } else {
        contentRef.onTraceClick(data);
      }
    }
  }
  const contentContext = {
    publish: contextEventListener
  };
  setContext(Context.CONTENT, contentContext);

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

<div class="flex w-full h-full cw:mb-8 tp:otop:pt-12">
  {#if !(isConstrainedWidth && $node.panel && $node.panel !== ResourcePanelType.DEFAULT && $node.panel !== ResourcePanelType.NONE)}
    <main
      class={cn("relative flex justify-center min-w-96 flex-1", {
        "h-full": $node.accessMode === AccessMode.FULL,
        "border-r border-brs2":
          $node.panel ||
          (webNodeTypeList.includes($node?.contentType) && !isConstrainedWidth),
        grow:
          $node.accessMode === AccessMode.POP ||
          $node.accessMode === AccessMode.INLINE,
        "mt-16":
          $context.isEmbed &&
          $context.os === OperatingSystem.IOS &&
          $node.contentType === NodeType.VIDEO,
        "mb-16": $node.panel === ResourcePanelType.CONTENT
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
  {#if (!isConstrainedWidth || (isConstrainedWidth && $node.panel !== ResourcePanelType.DEFAULT)) && $node.panel !== ResourcePanelType.CONTENT}
    <MediaNodeRightPane {node} {renderingDetails} {isConstrainedWidth} />
  {/if}
</div>
