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
  const dynamicLabelNodeTypes = [NodeType.TWEET];
  function resolveEmptyLabel() {
    //TODO - based on resource type
    return "Untitled";
  }
  onMount(async () => {
    if (dynamicLabelNodeTypes.includes(node.contentType)) {
      dynamicLabel = await resolveLabel();
    }
  });

  async function resolveLabel() {
    const dexie = $dataManager.cacheSource.dexie;
    if (node.contentType === NodeType.TWEET) {
      const defaultLabel = "Unknown tweet";
      if (!node.parent) return defaultLabel;
      const parent = await dexie.node.get(node.parent);
      if (!parent || !("name" in parent.body) || !parent.body?.name)
        return defaultLabel;
      return parent.body.name + " on X";
    }
  }
  function resolveFavicon() {
    let favicon;
    if (node.metadata?.faviconLink) {
      favicon = node.metadata.faviconLink;
    } else {
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

<div class="flex justify-between w-full">
  <span class="flex gap-2 min-w-0 flex-1">
    <!--TODO Avatar and parent breadcrumbs for node -->
    {#if webNodeTypeList.includes(node.contentType)}
      {@const favicon = resolveFavicon()}
      {#if favicon}
        <img
          use:lazyLoad={favicon}
          alt="favicon"
          class="w-5 h-5 rounded-full"
        />
      {:else}
        <Icon icon="globe-alt" size={Size.sm} />
      {/if}
    {/if}
    <span
      class="flex justify-between text-left truncate text-b2 font--medium min-w-0 flex-1"
    >
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
      {#if node.body?.url}
        <Icon icon="arrow-up-right" class="fill-fgs3" size={Size.xs} />
      {/if}
      <!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
    </span>
  </span>
  {#if node.isStarred}
    <Icon icon="star" class="fill-yellow-400" />
  {/if}
</div>
