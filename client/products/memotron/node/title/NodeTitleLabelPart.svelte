<script lang="ts">
  import { onMount } from "svelte";
  import { type INode, type INodeThumb, NodeType } from "../node.type";
  import { renderMdAsHtml } from "$lib/client/components/markdown/markdown.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import NodeAvatar from "../avatar/NodeAvatar.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { resolveNodeLabel } from "../node.utils";
  export let item: INodeThumb;
  export let isNodePageContext: boolean = false;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  let _label:
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
    _label = await resolveNodeLabel(item);
  });
</script>

<div
  class={cn("flex gap-1 items-center truncate userdata", {
    "text-h5": accessPoint === ResourceAccessPoint.SEARCH_RESULT,
    "text-b2":
      accessPoint !== ResourceAccessPoint.SEARCH_RESULT &&
      accessPoint !== ResourceAccessPoint.SELF,
    "text-fgs3": accessPoint === ResourceAccessPoint.MARKDOWN_EMBED,
    "text-h4 font-medium": accessPoint === ResourceAccessPoint.SELF
  })}
>
  <NodeAvatar
    node={item}
    size={accessPoint === ResourceAccessPoint.SELF ? Size.md : Size.sm}
    {accessPoint}
  />
  {#if item.labelSearch}
    {@html renderMdAsHtml(item.labelSearch, {
      isIncludeSpaces: true
    })}
  {:else if _label}
    {#if typeof _label === "string"}
      {_label ?? "Unknown"}
    {:else if typeof _label === "object" && "parent" in _label}
      <span class="flex w-full gap-1 items-center">
        <span>
          {#if accessPoint === ResourceAccessPoint.SEARCH_RESULT}
            {_label?.text ?? _label?.label}
          {:else}
            {_label?.label}
          {/if}
        </span>
        <button
          class={cn("truncate flex-1 min-w-0 text-left", {
            "underline-dotted cursor-pointer hover:underline-dotted-primary":
              isNodePageContext
          })}
          on:click={(e) => {
            appStore.resourceClickHandler(e, _label?.parent.id, {
              replaceId:
                accessPoint === ResourceAccessPoint.SELF ? item.id : undefined,
              defaultTo: ResourceAccessMode.POP
            });
          }}
        >
          {_label?.parent?.label}
        </button>
      </span>
    {/if}
  {:else}
    {resolveEmptyLabel()}
  {/if}
  <!-- {item.label ?? item.body ?? resolveEmptyLabel()} -->
</div>
