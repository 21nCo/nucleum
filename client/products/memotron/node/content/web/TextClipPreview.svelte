<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import {
    type INode,
    NodeType
  } from "$lib/client/products/memotron/node/node.type";
  import { cn, convertToRGBA } from "$lib/client/utils/ui.utils";
  import { truncateString } from "$lib/shared/utils/text.utils";
  export let node: INode;
  export let contentPreview: string;
  export let truncateLength: number | undefined = undefined;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
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
      const color = $highlightStore?.highlighters?.find(
        (x) => x.id === item.body.highlighterId
      )?.color;
      return color ? convertToRGBA(color, 0.4) : undefined;
    } else if (
      item.contentType === NodeType.KINDLE_HIGHLIGHT &&
      item.body.color
    ) {
      return getKindleHighlightRGBA(item.body.color, 0.3);
    } else {
      return undefined;
    }
  }
</script>

<div
  class={cn("rounded-md text-wrap userdata", {
    "m-4 p-4 bg-bgs2": accessPoint === ResourceAccessPoint.SELF
  })}
>
  <span
    class={cn("relative text-left", {
      "text-b2": accessPoint === ResourceAccessPoint.SELF
    })}
    style="background-color: {textHightlightColor
      ? textHightlightColor
      : 'transparent'};"
  >
    {truncateString(contentPreview, truncateLength)}
  </span>
</div>
