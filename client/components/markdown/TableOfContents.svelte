<script lang="ts">
  import type {
    IBlock,
    IMarkdownStore
  } from "$lib/client/components/markdown/md.type";
  import { onMount } from "svelte";
  import { getMdStore } from "./markdown.store";
  import Text from "$lib/client/elements/text/Text.svelte";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { headingNodeTypes } from "$lib/client/products/memotron/node/node.type";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
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
        HEADING: Number(block.contentType.slice(-1))
      }));
    if (!(headingBlocks.length > 0)) return;
    isHeadingAvailable = true;
  }
</script>

{#if isHeadingAvailable}
  <div class="w-full text-left">
    <div class="sticky top-10">
      {#each headingBlocks as block}
        <a
          href="#{block.id}"
          class={cn(
            "block text-base hover:bg-bgs2 truncate py-1.5 rounded-md",
            {
              "text-fgs3": block.id != $mdStore.activeHeading,
              "text-aps1": block.id == $mdStore.activeHeading
            }
          )}
          style="padding-left: {block.HEADING * 15}px;">{block.content}</a
        >
      {/each}
    </div>
  </div>
{:else}
  <EmptyStatusView mainText="No headings found" size={Size.sm} />
{/if}
