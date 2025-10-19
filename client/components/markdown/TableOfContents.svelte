<script lang="ts">
  import type {
    IBlock,
    IMarkdownStore
  } from "@21n/components/markdown/md.type";
  import { onMount } from "svelte";
  import { getMdStore } from "@21n/components/markdown/markdown.store";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { headingNodeTypes } from "@21n/products/memotron/node/node.type";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import { tooltip } from "@21n/actions/popover.action";
  import {
    isSameResource,
    resourceInList
  } from "@21n/components/flux/resourceStores/resource.utils";
  export let mdId: string;
  const mdStore = getMdStore(mdId);
  let mdcontainerID = "markDown-" + mdId;
  let mdContainerHeight: number | undefined;
  let headingBlocks: any;
  let isHeadingAvailable: boolean = false;
  onMount(() => {
    let mdContainerElement = document.getElementById(mdcontainerID);
    mdContainerHeight = mdContainerElement?.offsetHeight;
    const sub = mdStore.subscribe((x: IMarkdownStore) => {
      refresh(x.blocks);
    });
    return () => {
      sub();
    };
  });
  function refresh(blocks: IBlock[]) {
    headingBlocks = blocks
      .filter((block: IBlock) => headingNodeTypes.includes(block.contentType))
      .map((block: IBlock) => ({
        content: block.label ?? block.body,
        id: block.id,
        HEADING: Number(block.contentType.slice(-1)) - 1
      }));
    if (!(headingBlocks.length > 0)) return;
    isHeadingAvailable = true;
  }

  function scrollToHeading(e: MouseEvent, id: string) {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
</script>

{#if isHeadingAvailable}
  <div class="w-full text-left">
    <div class="sticky top-10">
      {#each headingBlocks as block}
        {@const isInView = $mdStore?.headingsInView?.some(
          resourceInList(block)
        )}
        {@const isFirstInView =
          $mdStore?.headingsInView?.[0] &&
          isSameResource($mdStore.headingsInView[0], block)}
        {@const isLastInView =
          $mdStore?.headingsInView?.[$mdStore?.headingsInView?.length - 1] &&
          isSameResource(
            $mdStore.headingsInView[$mdStore.headingsInView.length - 1],
            block
          )}
        {@const isActive =
          $mdStore.activeHeading &&
          isSameResource($mdStore.activeHeading, block)}
        <a
          href="#{block.id}"
          on:click={(e) => scrollToHeading(e, block.id)}
          class={cn(
            "flex items-center gap-1.5 text-b2 truncate py-1.5",
            {
              "hover:bg-bgs2 rounded-md": !isInView,
              "bg-bgs2": isInView,
              "rounded-t-md": isFirstInView,
              "rounded-b-md": isLastInView,
              "text-aps1": isActive && !$mdStore.params?.isReadOnly
            },
            (!isActive || $mdStore.params?.isReadOnly) && {
              "text-fgs1": isInView,
              "text-fgs3": !isInView
            }
          )}
          style="padding-left: {block.HEADING * 20}px;"
          use:tooltip={{
            isEnableOnlyOnTruncate: true,
            text: block.content
          }}
        >
          <span
            class={cn(
              "bg-aps1 min-w-1.5 h-1.5 flex justify-center items-center rounded-full",
              {
                "opacity-0": !isActive || $mdStore.params?.isReadOnly
              }
            )}
          >
          </span>
          <span>
            {block.content}
          </span>
        </a>
      {/each}
    </div>
  </div>
{:else}
  <EmptyStatusView mainText="No headings found" size={Size.sm} />
{/if}
