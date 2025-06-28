<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import InlineMarkdownTextInput from "$lib/client/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { getContext } from "svelte";
  import Resources from "../../../../components/record/Records.svelte";
  import LinkThumbnailItems from "../links/LinkThumbnailItems.svelte";
  import { nodeStore, type IActiveNodeStore } from "../node.store";
  import {
    canHaveTraces,
    NodeRightPaneType,
    NodeType,
    type INode,
    type INodeLinkThumb
  } from "../node.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { focusById } from "$lib/client/actions/focusById.action";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import RightPaneOverviewMetricCard from "./RightPaneOverviewMetricCard.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";

  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  let links: { link: INodeLinkThumb; node: INode }[] = [];
  const notesInputId = generateSimpleRandomId();
  const contentContext = getContext<any>("content");
  function onNotesChange(e: any) {
    if ($node.notes) node.modify({ notes: $node.notes });
  }

  async function refreshLinks(linksParam: INodeLinkThumb[] | undefined) {
    if (!linksParam) return;
    const result = await nodeStore.selectMany(
      {
        filters: {
          id: linksParam.map((x) => x.linkedTo.toString())
        }
      },
      {
        isExpand: true
      }
    );
    if (!result || result.length == 0) {
      links = [];
      return;
    }
    links = result.slice(0, 2).map((x: INode) => ({
      link: linksParam?.find((y) => isSameResource(y.linkedTo, x.id)),
      node: x
    }));
  }

  function onLinkClick(e: CustomEvent) {
    appStore.resourceClickHandler(e.detail.event, e.detail.id);
  }
</script>

<div
  class="flex flex-col gap-4 justify-center items-start w-full h-full p-2 dp:p-3"
>
  <Text content="Overview" style={TextStyle.PANEL_HEADING_SMALL} />

  {#if canHaveTraces.includes($node.contentType)}
    <div
      class="flex flex-row justify-around items-center w-full border border-brs3 rounded-md px-2 py-0.5"
    >
      <RightPaneOverviewMetricCard
        label="Links"
        icon="ph:link-simple-light"
        value={$node.links?.length || 0}
        on:click={() => (pane = NodeRightPaneType.LINKS)}
      />
      <RightPaneOverviewMetricCard
        label="Clips"
        icon="heroicons:bookmark"
        value={$node.clips?.length || 0}
        on:click={() => (pane = NodeRightPaneType.TRACES)}
      />
    </div>
  {/if}

  {#if $node.clips?.length > 0}
    <div class="flex flex-col gap-4 items-start w-full h-1/3 min-h-0">
      <span class="flex flex-row justify-between items-center w-full">
        <span class="flex flex-row gap-1 items-center">
          <Text content="Clips" style={TextStyle.SECTION_HEADING} />
          <Badge text={$node.clips?.length || 0} size={Size.sm} />
        </span>
        {#if $node.clips?.length > 2}
          <span>
            <Button
              size={Size.xs}
              icon="ph:arrow-right-light"
              label="View all"
              style={ButtonStyle.PLAIN}
              on:click={() => (pane = NodeRightPaneType.TRACES)}
            />
          </span>
        {/if}
      </span>
      <div class="flex flex-col w-full gap-4 overflow-auto">
        <Resources
          data={$node.clips.slice(0, 2)}
          accessPoint={ResourceAccessPoint.NODE_TRACES}
          resource={Resource.node}
          size={Size.sm}
          isPreventDefault={$node.contentType === NodeType.YOUTUBE_VIDEO}
          on:click={(e) => {
            if ($node.contentType !== NodeType.YOUTUBE_VIDEO) return;
            contentContext.publish("yt-trace-click", {
              id: e.detail.id,
              timestamp: e.detail.body.timestamp
            });
          }}
        />
      </div>
    </div>
  {:else}
    <div
      class={cn("flex flex-col gap-2 items-start w-full min-h-0", {
        "h-1/3": links.length > 0
      })}
    >
      <span class="flex flex-row justify-between items-center w-full">
        <span class="flex flex-row gap-1 items-center">
          <Text content="Links" style={TextStyle.SECTION_HEADING} />
          <Badge text={$node.links?.length || 0} size={Size.sm} />
        </span>
        <span>
          <Button
            size={Size.xs}
            icon="ph:arrow-right-light"
            label="View all"
            style={ButtonStyle.PLAIN}
            on:click={() => (pane = NodeRightPaneType.LINKS)}
          />
        </span>
      </span>
      <div class="w-full min-h-32 flex flex-col gap-3 overflow-auto">
        {#await refreshLinks($node.links)}
          <Icon icon="svg-spinners:3-dots-fade" />
        {:then}
          {#if links && links.length > 0}
            <LinkThumbnailItems
              {links}
              accessPointId={node.id}
              on:click={onLinkClick}
              accessPoint={ResourceAccessPoint.DEFAULT_RIGHT_PANE_LINKS}
            />
          {:else}
            <span
              class="flex w-full justify-center items-center text-fgs3 text-b3 h-1/2"
            >
              No links found
            </span>
          {/if}
        {/await}
      </div>
    </div>
  {/if}
  <div class="flex flex-col gap-2 items-start w-full flex-1 min-h-0 max-h-1/2">
    <span class="flex flex-row justify-between items-center w-full">
      <span class="flex flex-row gap-1 items-center">
        <Text content="Side notes" style={TextStyle.SECTION_HEADING} />
      </span>
      <span>
        <Button
          icon="ph:arrows-out-simple-light"
          size={Size.sm}
          on:click={() => (pane = NodeRightPaneType.SIDENOTES)}
        />
      </span>
    </span>
    <button
      class="flex w-full flex-1 bg-bgs2 bg-opacity-60 rounded-md p-4 overflow-y-auto"
      use:focusById={notesInputId}
    >
      <InlineMarkdownTextInput
        id={notesInputId}
        placeholder="Add notes"
        bind:content={$node.notes}
        on:debouncedChange={onNotesChange}
      />
    </button>
  </div>
</div>
