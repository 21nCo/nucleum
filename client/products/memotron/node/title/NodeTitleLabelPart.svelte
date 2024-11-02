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
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let item: INode;
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
    if (dynamicLabelNodeTypes.includes(item.contentType)) {
      dynamicLabel = await resolveLabel();
    }
  });

  async function resolveLabel() {
    if (!item) return "";

    let parent;
    if (item.parent && item.parent.id) parent = await item.parent;

    const defaultLabels = {
      [NodeType.TEXT_CLIP]:
        "Clipped Text - " + (item.body as ITextClipBody).text,
      [NodeType.YOUTUBE_TIMESTAMP_CLIP]:
        "Video timestamp - " +
        resolveVideoTimeStampStr(item.body as IVideoTimestampClipBody),
      [NodeType.WEB_SCREENSHOT_CLIP]: "Web screenshot",
      [NodeType.TWEET]: "Unknown tweet",
      [NodeType.KINDLE_HIGHLIGHT]: "Kindle highlight"
    };

    switch (item.contentType) {
      case NodeType.TEXT_CLIP:
      case NodeType.WEB_SCREENSHOT_CLIP:
      case NodeType.KINDLE_HIGHLIGHT:
        if (!parent?.label) return defaultLabels[item.contentType];
        return {
          label: "Clipped from:",
          parent,
          text: item.body?.text ?? "Unknown clip"
        };
      case NodeType.YOUTUBE_TIMESTAMP_CLIP:
        const timestamp = formatSeconds(item.body.timestamp, TimeFormat.CLOCK);
        if (!parent?.label) return `At - ${timestamp}`;
        return {
          label: `${timestamp} - `,
          parent,
          text: timestamp
        };
      case NodeType.TWEET:
        parent = parent as ITwitterProfile;
        if (!parent?.body?.name) return defaultLabels[NodeType.TWEET];
        return {
          label: "Tweet by ",
          parent: { id: parent.id, label: parent.body.name },
          text: item.body?.content
        };
      case NodeType.TWITTER_PROFILE:
        item = item as ITwitterProfile;
        return (
          item.metadata?.ogTitle ||
          ((item.body as ITwitterProfileBody).name
            ? item.body.name + " X profile"
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

<div
  class={cn("flex gap-1 items-center", {
    "text-h5": accessPoint === ResourceAccessPoint.SEARCH_RESULT,
    "text-b2": accessPoint !== ResourceAccessPoint.SEARCH_RESULT
  })}
>
  <NodeAvatar node={item} size={Size.sm} />
  {#if item.label && item.label.includes(".")}
    {item.label}
  {:else if item.label || item.labelSearch}
    {@html renderMdAsHtml(item.labelSearch ?? item.label, {
      isIncludeSpaces: true
    })}
  {:else if dynamicLabelNodeTypes.includes(item.contentType) && dynamicLabel}
    {#if typeof dynamicLabel === "string"}
      {dynamicLabel ?? "Unknown"}
    {:else if typeof dynamicLabel === "object" && "parent" in dynamicLabel}
      <span class="flex w-full gap-1 items-center">
        <span>
          {#if accessPoint === ResourceAccessPoint.SEARCH_RESULT}
            {dynamicLabel?.text ?? dynamicLabel?.label}
          {:else}
            {dynamicLabel?.label}
          {/if}
        </span>
        <button
          class={cn("truncate flex-1 min-w-0 text-left", {
            "underline-dotted cursor-pointer hover:underline-dotted-primary":
              isNodePageContext
          })}
          on:click={(e) => {
            appStore.resourceClickHandler(e, dynamicLabel?.parent.id, {
              replaceId:
                accessPoint === ResourceAccessPoint.SELF ? item.id : undefined,
              defaultTo: ResourceAccessMode.POP
            });
          }}
        >
          {dynamicLabel?.parent?.label}
        </button>
      </span>
    {/if}
  {:else if item.body && typeof item.body === "string"}
    {@html renderMdAsHtml(item.bodySearch ?? item.body, {
      isIncludeSpaces: true
    })}
  {:else if item.body && item.body.text && typeof item.body.text === "string"}
    {item.body.text}
  {:else}
    {resolveEmptyLabel()}
  {/if}
  <!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
</div>
