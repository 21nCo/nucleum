<script lang="ts">
  import { highlightStore } from "../../../common/highlighters/highlight.store";
  import { NodeType, type INode } from "../../node.type";
  import { resolveContentPreview } from "../../node.utils";
  export let node: INode;
  const contentPreview = resolveContentPreview(
    node.body,
    node.contentType,
    node.metadata
  );
</script>

<div class="w-full h-full flex justify-center items-center">
  {#if node.contentType === NodeType.TEXT_CLIP}
    {@const textHightlightColor = node.body.highlighterId
      ? $highlightStore?.highlighters?.find(
          (x) => x.id === node.body.highlighterId
        )?.color
      : undefined}
    <div class="p-4 bg-bgs2 rounded-md">
      <span
        class="relative text-left text-b2"
        style="background-color: {textHightlightColor
          ? textHightlightColor
          : 'transparent'};"
      >
        {contentPreview}
      </span>
    </div>
  {:else if (node.contentType === NodeType.WEB_SCREENSHOT_CLIP || node.contentType === NodeType.VIDEO_TIMESTAMP_CLIP) && node.body.s3Url}
    <img
      alt="..."
      class="absolute inset-0 w-full rounded-t-md object-contain h-full"
      src={node.body.s3Url}
    />
  {/if}
</div>
