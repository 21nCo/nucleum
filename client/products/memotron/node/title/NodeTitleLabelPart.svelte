<script lang="ts">
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { onMount } from "svelte";
  import { type INode, NodeType } from "../node.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { TimeFormat } from "$lib/client/types/time.type";
  export let node: INode;
  export let isNodePageContext: boolean = false;
  let dynamicLabel:
    | string
    | {
        label: string;
        parent: {
          id: string;
          label: string;
        };
      }
    | undefined = undefined;
  const dynamicLabelNodeTypes = [
    NodeType.TWEET,
    NodeType.TWITTER_PROFILE,
    NodeType.TEXT_CLIP,
    NodeType.WEB_SCREENSHOT_CLIP,
    NodeType.VIDEO_TIMESTAMP_CLIP
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
      return {
        label: "Text clipped from -",
        parent
      };
    }
    if (node.contentType === NodeType.VIDEO_TIMESTAMP_CLIP) {
      const timeStampStr = formatSeconds(node.body.timestamp, TimeFormat.CLOCK);
      const defaultLabel = "Video timestamp - " + timeStampStr;
      if (!parent || !parent.label) return defaultLabel;
      return {
        label: timeStampStr + " - ",
        parent
      };
    }
    if (node.contentType === NodeType.WEB_SCREENSHOT_CLIP) {
      const defaultLabel = "Web screenshot";
      if (!parent || !parent.label) return defaultLabel;
      return {
        label: "Screenshot -",
        parent
      };
    }
    if (node.contentType === NodeType.TWEET) {
      const defaultLabel = "Unknown tweet";
      if (!parent || !("name" in parent.body) || !parent.body?.name)
        return defaultLabel;
      return {
        label: "Tweet by ",
        parent: {
          id: parent.id,
          label: parent.body.name
        }
      };
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
  {#if typeof dynamicLabel === "string"}
    {dynamicLabel}
  {:else}
    {dynamicLabel?.label}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <span
      class={cn({
        "underline-dotted truncate cursor-pointer hover:underline-dotted-primary":
          isNodePageContext
      })}
      on:click={(e) => {
        appStore.resourceClickHandlerWithReplace(
          e,
          dynamicLabel?.parent.id,
          node.id
        );
      }}
    >
      {dynamicLabel?.parent?.label}
    </span>
  {/if}
{:else if node.body && typeof node.body === "string"}
  {@html renderMdAsHtml(node.body)}
{:else if node.body && node.body.text && typeof node.body.text === "string"}
  {node.body.text}
{:else}
  {resolveEmptyLabel()}
{/if}
<!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
