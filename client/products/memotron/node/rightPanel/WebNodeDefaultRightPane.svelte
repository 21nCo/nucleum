<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import InlineMarkdownTextInput from "@21n/components/markdown/content/InlineMarkdownTextInput.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import Badge from "@21n/elements/text/Badge.svelte";
  import Text from "@21n/elements/text/Text.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { TextStyle } from "@21n/types/text.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { getContext } from "svelte";
  import Resources from "@21n/components/record/Records.svelte";
  import LinkThumbnailItems from "@21n/products/memotron/node/links/LinkThumbnailItems.svelte";
  import {
    nodeStore,
    type IActiveNodeStore
  } from "@21n/products/memotron/node/node.store";
  import {
    canHaveTraces,
    NodeRightPaneType,
    NodeType,
    type INode,
    type INodeLinkThumb
  } from "@21n/products/memotron/node/node.type";
  import { appStore } from "@21n/stores/app.store";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import { focusById } from "@21n/actions/focusById.action";
  import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
  import RightPaneOverviewMetricCard from "@21n/products/memotron/node/rightPanel/RightPaneOverviewMetricCard.svelte";
  import Icon from "@21n/elements/Icon.svelte";

  export let node: IActiveNodeStore;
  export let pane: NodeRightPaneType | undefined = undefined;
  let links: { link: INodeLinkThumb; node: INode }[] = [];
  let _notes = $node.notes;
  const notesInputId = generateSimpleRandomId();
  const contentContext = getContext<any>("content");

  function onNotesChange(e: any) {
    if (_notes !== undefined)
      node.modify({ notes: _notes }, { isPreventBackPropagation: true });
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
  class="flex flex-col gap-4 justify-center items-start w-full h-full bg-bgs2 cw:p-2"
>
  <div class="pt-2 px-2 dp:px-3">
    <Text content="Overview" style={TextStyle.PANEL_HEADING_SMALL} />
  </div>

  {#if canHaveTraces.includes($node.contentType)}
    <div class="grid grid-cols-2 w-full h-10">
      <RightPaneOverviewMetricCard
        label="Links"
        icon="link"
        value={$node.links?.length || 0}
        on:click={() => (pane = NodeRightPaneType.LINKS)}
      />
      <RightPaneOverviewMetricCard
        label="Bookmarks"
        icon="bookmark"
        value={$node.clips?.length || 0}
        on:click={() => (pane = NodeRightPaneType.BOOKMARKS)}
      />
    </div>
  {/if}

  {#if $node.clips?.length > 0}
    <div
      class="flex flex-col gap-4 items-start w-full h-1/3 min-h-0 px-2 dp:px-3"
    >
      <span class="flex flex-row justify-between items-center w-full">
        <span class="flex flex-row gap-1 items-center">
          <Text content="Bookmarks" style={TextStyle.SECTION_HEADING} />
          <Badge text={$node.clips?.length || 0} size={Size.sm} />
        </span>
        {#if $node.clips?.length > 2}
          <span>
            <Button
              size={Size.xs}
              icon="proceed"
              label="View all"
              style={ButtonStyle.PLAIN}
              on:click={() => (pane = NodeRightPaneType.BOOKMARKS)}
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
          isPreventDefault={$node.contentType === NodeType.YOUTUBE_VIDEO ||
            $node.contentType === NodeType.YOUTUBE_SHORT}
          on:click={(e) => {
            if (
              $node.contentType !== NodeType.YOUTUBE_VIDEO &&
              $node.contentType !== NodeType.YOUTUBE_SHORT
            )
              return;
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
      class={cn("flex flex-col gap-2 items-start w-full min-h-0 px-2 dp:px-3", {
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
            icon="proceed"
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
  <div
    class="flex flex-col gap-1 items-start w-full flex-1 min-h-0 max-h-1/2 border-t border-brs2 pt-1"
  >
    <span
      class="flex flex-row justify-between items-center w-full px-2 dp:px-3"
    >
      <span class="flex flex-row gap-1 items-center">
        <Text content="Side notes" style={TextStyle.SECTION_HEADING} />
      </span>
      <span>
        <Button
          icon="expand"
          size={Size.sm}
          on:click={() => (pane = NodeRightPaneType.SIDENOTES)}
        />
      </span>
    </span>
    <button
      class="flex w-full flex-1 bg-bgs2 bg-opacity-60 p-4 overflow-y-auto"
      use:focusById={notesInputId}
    >
      <InlineMarkdownTextInput
        id={notesInputId}
        placeholder="Add notes"
        bind:content={_notes}
        on:debouncedChange={onNotesChange}
      />
    </button>
  </div>
</div>
