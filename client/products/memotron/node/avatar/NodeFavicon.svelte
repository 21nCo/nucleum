<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { Size } from "$lib/client/types/size.enum";
  import { lazyLoad } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import { type INode, NodeType } from "../../node/node.type";
  import { commonMetadata } from "../../common/urlMap";
  export let node: INode;
  let favicon: string | undefined = undefined;
  onMount(async () => {
    favicon = await resolveFavicon();
  });

  async function resolveFavicon() {
    const dexie = $dataManager.cacheSource.dexie;
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
      const parent = await dexie.node.get(node.parent);
      if (parent && parent.metadata?.faviconLink)
        return parent.metadata.faviconLink;
    }

    if (!node.body) return;

    if (
      !("url" in node.body) ||
      !node.body.url ||
      !node.body.url.includes("https://")
    )
      return;
    const hostPart = new URL(node.body.url).host;
    let favicon = commonMetadata.find(
      (x) => hostPart === x.domain || hostPart.includes("." + x.domain)
    )?.faviconUrl;
    if (favicon) return favicon;
    //TODO - testing
    favicon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostPart}&size=128"`;
    return favicon;
  }
</script>

<span class="shrink-0">
  {#if favicon}
    <img use:lazyLoad={favicon} alt="favicon" class="w-5 h-5 rounded-full" />
  {:else if node.contentType === NodeType.KINDLE_HIGHLIGHT}
    <Icon icon="book-open" size={Size.sm} />
  {:else}
    <Icon icon="globe-alt" size={Size.sm} />
  {/if}
</span>
