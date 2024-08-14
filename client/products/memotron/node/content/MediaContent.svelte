<script lang="ts">
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { type IActiveNodeStore } from "../node.store";
  import AudioScrubablePreview from "../../capture/AudioScrubablePreview.svelte";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  export let node: IActiveNodeStore;
  export let accessMode: ResourceAccessMode;
  export let renderingDetails: any;
  let refreshId = Date.now();
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
  function retireveNode() {
    node.fetch();
    refreshId = Date.now();
  }
</script>

<div
  class={cn("relative flex w-full justify-center", {
    "h-full": accessMode === ResourceAccessMode.FOCUS,
    grow:
      accessMode === ResourceAccessMode.POP ||
      accessMode === ResourceAccessMode.INLINE
  })}
>
  {#if $node?.contentType === NodeType.AUDIO && $node && "url" in $node.body}
    <!-- <audio controls src={$node.body?.url} /> -->
    <!-- TODO - relay refresh event to top instead of refreshing here -->
    <AudioScrubablePreview on:refresh body={$node?.body} nodeId={$node.id} />
  {:else if $node?.contentType === NodeType.VIDEO && $node && "url" in $node.body}
    <video controls>
      <source src={$node.body.url} />
      <track kind="captions" />
    </video>
  {:else if $node?.contentType === NodeType.IMAGE && $node && "url" in $node.body}
    <!-- <div
        class="absolute inset-0 bg-cover bg-center filter blur-lg scale-110"
        style="background-image: url('{$node.body.url}');"
      ></div>
      <div class="absolute inset-0 bg-black opacity-30"></div> -->
    <img
      bind:this={imgRef}
      alt="..."
      class={cn("absolute inset-0 w-full h-full object-contain", {
        // "object-contain": isPortrait,
        // "object-cover": !isPortrait
      })}
      src={$node.body.url}
    />
  {/if}
</div>
