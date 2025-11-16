<script lang="ts">
  import { nodeStore } from "@21n/products/memotron/node/node.store";
  import type {
    INode,
    INodeLinkThumb,
    INodeThumb
  } from "@21n/products/memotron/node/node.type";
  import {
    isSameResource,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { resolveNodeLabelString } from "@21n/products/memotron/node/node.utils";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import { logger } from "@21n/components/debug/logger.client";
  import { appStore } from "@21n/stores/app.store";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { linkTagStore } from "@21n/products/memotron/linking/link.store";
  import { linkTagLabelMapper } from "@21n/products/memotron/linking/link.utils";

  export let node: INode;
  let isLoading = false;
  let linkedNodes: INodeThumb[] = [];
  let groups: { date: string; nodes: INodeThumb[] }[] = [];

  $: tags = $linkTagStore?.map(linkTagLabelMapper) || [];

  async function loadTimelineData(links: INodeLinkThumb[] | undefined) {
    try {
      isLoading = true;
      if (!links || links.length === 0) {
        linkedNodes = [];
        return;
      }
      linkedNodes = await nodeStore.selectMany({
        properties: {
          select: [
            "id",
            "label",
            "body",
            "contentType",
            "metadata",
            "url",
            "createdAt"
          ],
          expand: ["parent"]
        },
        filters: {
          id: links.map((x: INodeLinkThumb) => x.linkedTo.toString())
        }
      });
      linkedNodes.sort((a, b) => {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      groups = groupNodesByDate(linkedNodes);
    } catch (error) {
      logger.error({ at: "loadTimelineData", error });
    } finally {
      isLoading = false;
    }
  }

  function groupNodesByDate(nodes: INodeThumb[]) {
    const groups = new Map<string, INodeThumb[]>();

    nodes.forEach((node) => {
      const date = parseAndFormatDate(new Date(node.createdAt));
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)?.push(node);
    });

    return Array.from(groups.entries()).map(([date, nodes]) => ({
      date,
      nodes
    }));
  }

  function handleNodeClick(nodeId: string, event: MouseEvent) {
    appStore.resourceClickHandlerForGraph(nodeId, event, {
      replaceId: node.id
    });
  }
</script>

<div class="flex flex-col w-full h-full overflow-auto px-4 dp:px-12">
  {#await loadTimelineData(node?.links)}
    <EmptyStatusView
      size={Size.sm}
      isLoadingState={true}
      mainText="Loading timeline"
      subText="Please wait while we load the timeline data"
    />
  {:then}
    <div class="flex flex-col gap-8 relative pl-6">
      <div class="absolute left-[6px] -top-2 bottom-0 w-[2px] bg-bgs4" />
      {#each groups as group, index}
        {#if index === 0}
          <ScrollViewBottomSpacer size={Size.sm} />
        {/if}
        <div class="flex gap-4 items-start relative">
          <div class="absolute -left-[23px] top-0 flex items-center h-[24px]">
            <div class="w-[8px] h-[8px] rounded-full bg-fgs3" />
          </div>
          <div class="flex flex-col gap-1.5 flex-grow">
            <div
              class="text-b3 text-fgs3 h-[24px] flex items-center tabular-nums"
            >
              {group.date}
            </div>
            <div class="flex flex-col gap-2">
              {#each group.nodes as linkedNode}
                {@const link = node.links?.find((l) =>
                  isSameResource(l.linkedTo, linkedNode)
                )}
                <button
                  class="flex flex-col gap-1 p-3 rounded-md bg-bgs2 hover:bg-bgs3 border border-brs3 text-left w-full userdata"
                  on:click={(e) => handleNodeClick(linkedNode.id.toString(), e)}
                >
                  <div class="text-b2 text-fgs1">
                    {resolveNodeLabelString(linkedNode)}
                  </div>
                  {#if link?.tags?.length}
                    <div class="flex gap-2">
                      {#each link.tags as tag}
                        <span
                          class="text-b3 text-fgs3 bg-bgs3 px-2 py-0.5 rounded"
                        >
                          {tags.find(resourceInList(tag))?.label ?? ""}
                        </span>
                      {/each}
                    </div>
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
        {#if index === groups.length - 1}
          <ScrollViewBottomSpacer size={Size.xl} />
        {/if}
      {/each}
    </div>
  {/await}
</div>
