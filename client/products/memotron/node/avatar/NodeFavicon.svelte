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
    let favicon;
    const dexie = $dataManager.cacheSource.dexie;
    if (
      node.contentType === NodeType.TWITTER_PROFILE &&
      node.body.profileImageUrl
    ) {
      favicon = node.body.profileImageUrl;
    } else if (node.metadata?.faviconLink) {
      favicon = node.metadata.faviconLink;
    } else if (node.parent) {
      const parent = await dexie.node.get(node.parent);
      if (parent && parent.metadata?.faviconLink)
        favicon = parent.metadata.faviconLink;
    }
    if (!favicon && node.body) {
      if (
        !("url" in node.body) ||
        !node.body.url ||
        !node.body.url.includes("https://")
      )
        return;
      const hostPart = new URL(node.body.url).host;
      favicon = commonMetadata.find(
        (x) => hostPart === x.domain || hostPart.includes("." + x.domain)
      )?.faviconUrl;
      if (!favicon) {
        //TODO - testing
        favicon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostPart}&size=128"`;
      }
    }
    return favicon;
  }
</script>

<span class="shrink-0">
  {#if favicon}
    <img use:lazyLoad={favicon} alt="favicon" class="w-5 h-5 rounded-full" />
  {:else}
    <Icon icon="globe-alt" size={Size.sm} />
  {/if}
</span>
