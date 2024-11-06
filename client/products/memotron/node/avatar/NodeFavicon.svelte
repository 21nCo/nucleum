<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import { type INode, NodeType } from "../../node/node.type";
  import { urlMap } from "../../common/urlMap";
  import { lazyLoad } from "$lib/client/actions/lazyload.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { resolveNodeFavicon } from "../node.utils";
  export let node: INode;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let favicon: string | undefined = undefined;
  onMount(() => {
    favicon = resolveNodeFavicon(node);
  });
</script>

<span class="shrink-0 flex items-center justify-center">
  {#if node.contentType === NodeType.TEXT_CLIP}
    <Icon icon="ph:highlighter-circle-thin" {size} />
  {:else if node.contentType === NodeType.WEB_SCREENSHOT_CLIP}
    <Icon icon="ph:crop-thin" {size} />
  {:else if node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <Icon icon="book-open" {size} />
  {:else if favicon}
    <img
      use:lazyLoad={favicon}
      alt="favicon"
      class={cn("rounded-full", {
        "w-4 h-4": size === Size.sm,
        "w-5 h-5": size === Size.md,
        "w-6 h-6": size === Size.lg
      })}
    />
  {:else}
    <Icon icon="globe-alt" {size} />
  {/if}
</span>
