<script lang="ts">
  import FileView from "$lib/client/components/files/FileView.svelte";
  import {
    type IKindleHighlight,
    type ITextClip,
    type IWebScreenshotClip,
    NodeType
  } from "../../node.type";
  import { resolveContentPreview } from "../../node.utils";
  import TextClipPreview from "./TextClipPreview.svelte";
  export let node: ITextClip | IWebScreenshotClip | IKindleHighlight;
  export let isNodePageContext: boolean = false;
  const contentPreview = resolveContentPreview(node);
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if node.contentType === NodeType.TEXT_CLIP || node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <TextClipPreview {node} {contentPreview} {isNodePageContext} />
  {:else if node.contentType === NodeType.WEB_SCREENSHOT_CLIP && node.body.file}
    <!-- <img
      alt="..."
      class="absolute inset-0 w-full rounded-t-md object-contain h-full"
      src={node.body.s3Url}
    /> -->
    <FileView id={node.body.file} />
  {/if}
</div>
