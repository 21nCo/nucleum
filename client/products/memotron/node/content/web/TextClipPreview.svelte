<script lang="ts">
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import {
    type INode,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  export let node: INode;
  export let contentPreview: string;
  export let isNodePageContext: boolean = false;
  let textHightlightColor = resolveTextHighlightColor(node);

  function getKindleHighlightRGBA(color: string, opacity: number) {
    const colorMap = {
      blue: "0, 0, 255",
      green: "0, 255, 0",
      yellow: "255, 255, 0",
      orange: "255, 128, 0",
      pink: "255, 0, 255"
    };
    return `rgba(${colorMap[color]}, ${opacity})`;
  }

  function resolveTextHighlightColor(item: any) {
    if (item.contentType === NodeType.TEXT_CLIP && item.body.highlighterId) {
      return $highlightStore?.highlighters?.find(
        (x) => x.id === item.body.highlighterId
      )?.color;
    } else if (
      item.contentType === NodeType.KINDLE_HIGHLIGHT &&
      item.body.color
    ) {
      return getKindleHighlightRGBA(item.body.color, 0.3);
    } else {
      return undefined;
    }
  }
  $: console.log({ contentPreview });
</script>

<div
  class={cn("rounded-md", {
    "p-4 bg-bgs2": isNodePageContext
  })}
>
  <span
    class="relative text-left text-b2"
    style="background-color: {textHightlightColor
      ? textHightlightColor
      : 'transparent'};"
  >
    {contentPreview}
  </span>
</div>
