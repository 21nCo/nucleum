<script lang="ts">
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    type IKindleHighlight,
    type ITextClip,
    type IWebScreenshotClip,
    NodeType
  } from "../../node.type";
  import { resolveContentPreview } from "../../node.utils";
  import TextClipPreview from "./TextClipPreview.svelte";
  export let node: ITextClip | IWebScreenshotClip | IKindleHighlight;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let truncateLength: number | undefined = undefined;
  const contentPreview = resolveContentPreview(node);
</script>

<div
  class={cn("w-full h-full flex justify-center items-center", {
    "max-h-32": accessPoint !== ResourceAccessPoint.SELF
  })}
>
  {#if node.contentType === NodeType.TEXT_CLIP || node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <TextClipPreview {node} {contentPreview} {truncateLength} {accessPoint} />
  {:else if node.contentType === NodeType.WEB_SCREENSHOT_CLIP && node.body.file}
    <!-- <img
      alt="..."
      class="absolute inset-0 w-full rounded-t-md object-contain h-full"
      src={node.body.s3Url}
    /> -->
    <FileView id={node.body.file} class="h-full w-full object-cover" />
  {/if}
</div>
