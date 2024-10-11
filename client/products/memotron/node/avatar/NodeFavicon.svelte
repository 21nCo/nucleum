<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import { type INode, NodeType } from "../../node/node.type";
  import { urlMap } from "../../common/urlMap";
  import { lazyLoad } from "$lib/client/actions/lazyload.action";
  import { cn } from "$lib/client/utils/ui.utils";
  export let node: INode;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  let favicon: string | undefined = undefined;
  onMount(async () => {
    favicon = await resolveFavicon();
  });

  async function resolveFavicon() {
    if (
      node.contentType === NodeType.TWITTER_PROFILE &&
      "profileImageUrl" in node.body &&
      node.body.profileImageUrl
    ) {
      return node.body.profileImageUrl;
    } else if (
      node.contentType === NodeType.KINDLE_BOOK &&
      "imageUrl" in node.body &&
      node.body.imageUrl
    ) {
      return node.body.imageUrl;
    } else if (node.metadata?.faviconLink) {
      return node.metadata.faviconLink;
    } else if (node.parent) {
      //TODO - resolve using context API
      // const parent = await dexie.node.get(node.parent);
      // if (parent && parent.metadata?.faviconLink)
      //   return parent.metadata.faviconLink;
    }

    if (!("url" in node) || !node.url || !node.url.includes("https://")) return;
    const hostPart = new URL(node.url).host;
    let favicon = urlMap.find(
      (x) => hostPart === x.domain || hostPart.includes("." + x.domain)
    )?.faviconUrl;
    if (favicon) return favicon;
    //TODO - testing
    favicon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostPart}&size=128"`;
    return favicon;
  }
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
