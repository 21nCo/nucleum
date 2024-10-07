<script lang="ts">
  import { onMount } from "svelte";
  import {
    type INode,
    type ITextClipBody,
    NodeType,
    type IVideoTimestampClipBody,
    type ITwitterProfileBody,
    type ITwitterProfile
  } from "../node.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  export let node: INode;
  export let isNodePageContext: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
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
    NodeType.YOUTUBE_TIMESTAMP_CLIP,
    NodeType.KINDLE_HIGHLIGHT
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
    if (!node) return "";

    let parent;
    if (node.parent && node.parent.id) parent = await node.parent;

    const defaultLabels = {
      [NodeType.TEXT_CLIP]:
        "Clipped Text - " + (node.body as ITextClipBody).text,
      [NodeType.YOUTUBE_TIMESTAMP_CLIP]:
        "Video timestamp - " +
        resolveVideoTimeStampStr(node.body as IVideoTimestampClipBody),
      [NodeType.WEB_SCREENSHOT_CLIP]: "Web screenshot",
      [NodeType.TWEET]: "Unknown tweet",
      [NodeType.KINDLE_HIGHLIGHT]: "Kindle highlight"
    };

    switch (node.contentType) {
      case NodeType.TEXT_CLIP:
      case NodeType.YOUTUBE_TIMESTAMP_CLIP:
      case NodeType.WEB_SCREENSHOT_CLIP:
      case NodeType.KINDLE_HIGHLIGHT:
        if (!parent?.label) return defaultLabels[node.contentType];
        return {
          label: "Clipped from:",
          parent
        };
      case NodeType.TWEET:
        parent = parent as ITwitterProfile;
        if (!parent?.body?.name) return defaultLabels[NodeType.TWEET];
        return {
          label: "Tweet by ",
          parent: { id: parent.id, label: parent.body.name }
        };
      case NodeType.TWITTER_PROFILE:
        node = node as ITwitterProfile;
        return (
          node.metadata?.ogTitle ||
          ((node.body as ITwitterProfileBody).name
            ? node.body.name + " X profile"
            : "Unknown X profile")
        );
      default:
        return "";
    }

    function resolveVideoTimeStampStr(body: IVideoTimestampClipBody) {
      return formatSeconds(body.timestamp, TimeFormat.CLOCK);
    }
  }
</script>

<!-- TODO - if node and has parent, show breadcrumbs -->
{#if node.label && node.label.includes(".")}
  {node.label}
{:else if node.label}
  {@html renderMdAsHtml(node.labelSearch ?? node.label)}
{:else if dynamicLabelNodeTypes.includes(node.contentType) && dynamicLabel}
  {#if typeof dynamicLabel === "string"}
    {dynamicLabel}
  {:else if typeof dynamicLabel === "object" && "parent" in dynamicLabel}
    <span class="flex w-full gap-1 items-center">
      <span>
        {dynamicLabel?.label}
      </span>
      <button
        class={cn("truncate flex-1 min-w-0 text-left", {
          "underline-dotted cursor-pointer hover:underline-dotted-primary":
            isNodePageContext
        })}
        on:click={(e) => {
          appStore.resourceClickHandler(e, dynamicLabel?.parent.id, {
            replaceId: node.id
          });
        }}
      >
        {dynamicLabel?.parent?.label}
      </button>
    </span>
  {/if}
{:else if node.body && typeof node.body === "string"}
  {@html renderMdAsHtml(node.bodySearch ?? node.body)}
{:else if node.body && node.body.text && typeof node.body.text === "string"}
  {node.body.text}
{:else}
  {resolveEmptyLabel()}
{/if}
<!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
