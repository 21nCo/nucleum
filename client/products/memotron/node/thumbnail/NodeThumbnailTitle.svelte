<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import AvatarView from "$lib/client/elements/avatarPicker/AvatarView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { MemotronResourceType } from "$lib/client/products/memotron/memotron.type";
  import { Size } from "$lib/client/types/size.enum";
  import { lazyLoad } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import { type INode, NodeType, webNodeTypeList } from "../../node/node.type";
  import { commonMetadata } from "../../common/urlMap";
  export let node: INode;
  let dynamicLabel: string | undefined = undefined;
  let favicon: string | undefined = undefined;
  const dynamicLabelNodeTypes = [
    NodeType.TWEET,
    NodeType.TWITTER_PROFILE,
    NodeType.TEXT_CLIP,
    NodeType.WEB_SCREENSHOT_CLIP
  ];
  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
  onMount(async () => {
    if (dynamicLabelNodeTypes.includes(node.contentType)) {
      dynamicLabel = await resolveLabel();
    }
    favicon = await resolveFavicon();
  });

  async function resolveLabel() {
    const dexie = $dataManager.cacheSource.dexie;
    let parent;
    if (node.parent) parent = await dexie.node.get(node.parent);
    if (node.contentType === NodeType.TEXT_CLIP) {
      const defaultLabel = "Clipped Text - " + node.body.text;
      if (!parent || !parent.label) return defaultLabel;
      return "Text clipped from - " + parent.label;
    }
    if (node.contentType === NodeType.WEB_SCREENSHOT_CLIP) {
      const defaultLabel = "Web screenshot";
      if (!parent || !parent.label) return defaultLabel;
      return "Screenshot: " + parent.label;
    }
    if (node.contentType === NodeType.TWEET) {
      const defaultLabel = "Unknown tweet";
      if (!parent || !("name" in parent.body) || !parent.body?.name)
        return defaultLabel;
      return parent.body.name + " on X";
    } else if (node.contentType === NodeType.TWITTER_PROFILE) {
      const defaultLabel = "Unknown X profile";
      if (node.metadata?.ogTitle) return node.metadata.ogTitle;
      else if (node.body.name) return node.body.name + " X profile";
      else return defaultLabel;
    }
  }
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

<div class="flex gap-1 w-full">
  <!--TODO Avatar and parent breadcrumbs for node -->
  {#if webNodeTypeList.includes(node.contentType)}
    <span class="shrink-0">
      {#if favicon}
        <img
          use:lazyLoad={favicon}
          alt="favicon"
          class="w-5 h-5 rounded-full"
        />
      {:else}
        <Icon icon="globe-alt" size={Size.sm} />
      {/if}
    </span>
  {/if}
  <div class="flex-1 min-w-0">
    <div class="text-left truncate text-b2 font--medium">
      <!-- TODO - if node and has parent, show breadcrumbs -->
      {#if node.label}
        {node.label}
      {:else if dynamicLabelNodeTypes.includes(node.contentType)}
        {dynamicLabel}
      {:else if node.body && typeof node.body === "string"}
        <InlineMarkdownTextInput content={node.body} />
      {:else if node.body && node.body.text && typeof node.body.text === "string"}
        {node.body.text}
      {:else}
        {resolveEmptyLabel()}
      {/if}
      <!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
    </div>
  </div>
  <span class="flex items-center gap-1 shrink-0">
    {#if node.body?.url}
      <Icon icon="arrow-up-right" class="fill-fgs3" size={Size.xs} />
    {/if}
    {#if node.isStarred}
      <Icon icon="star" class="fill-yellow-400" />
    {/if}
  </span>
</div>
