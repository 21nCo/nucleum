<script lang="ts">
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { onMount } from "svelte";
  import { type INode, NodeType } from "../node.type";
  export let node: INode;
  let dynamicLabel: string | undefined = undefined;
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
</script>

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
