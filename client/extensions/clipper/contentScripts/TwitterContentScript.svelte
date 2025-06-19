<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { webpage } from "./store";
  import { extractTweet, extractTweetFromTweeetPage } from "../clipper.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  import {
    linker,
    linkTagStore
  } from "$lib/client/products/memotron/linking/link.store";
  import { hoverable } from "$lib/client/actions/hover.action";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";

  let isSaved: boolean = false;
  let isSaving: boolean = false;
  let isHovering: boolean = false;

  async function onClick(event: MouseEvent) {
    try {
      if (isSaving || !(event.target instanceof Element)) return;
      isSaving = true;
      const tweetNode = extractTweet(event.target);
      logger.log({ at: "Tweet onClick", event, tweetNode });
      if (!tweetNode) {
        logger.error("Tweet node not found");
        return;
      }
      let mainTweetId: IRecordId | undefined = undefined;
      if (tweetNode.metadata?.replyTo) {
        const mainTweetNode = extractTweetFromTweeetPage();
        if (mainTweetNode) {
          const mainTweetResult = await webpage.saveTweet(mainTweetNode, true);
          mainTweetId = mainTweetResult?.id;
        }
      }
      const tweetResult = await webpage.saveTweet(tweetNode);
      if (mainTweetId && tweetResult) {
        const tweetReplyLinkTagId = await linkTagStore.save("reply", "tweet");
        await linker.link(tweetResult.id, mainTweetId, {
          content: {
            tags:
              !Array.isArray(tweetReplyLinkTagId) && tweetReplyLinkTagId?.id
                ? [tweetReplyLinkTagId?.id]
                : []
          }
        });
      }
      isSaved = true;
      isSaving = false;
    } catch (err) {
      logger.error("Error saving tweet", err);
    } finally {
      isSaving = false;
    }
  }
</script>

<button class="mr-4" on:click|stopPropagation={onClick}>
  <HoverableElement
    tooltip={isSaving && isSaved
      ? "Reparsing..."
      : isSaving
        ? "Saving..."
        : isSaved
          ? "Saved to Memotron"
          : "Save to Memotron"}
    tooltipOptions={{
      isUseAbsolutePositioning: true,
      placement: Placement.TopCenter
    }}
    class="flex justify-center items-center"
  >
    <div
      use:hoverable={{
        onHover: (val) => (isHovering = val)
      }}
      class={cn("flex justify-center items-center bg-aps2 hover:bg-aps1", {
        "p-0.5": isSaving,
        "rounded-sm": !isSaved,
        "rounded-full": isSaved
      })}
    >
      <Icon
        icon={isSaving
          ? "svg-spinners:3-dots-fade"
          : isSaved
            ? "check-circle"
            : "plus"}
        size={isSaving ? Size.sm : Size.md}
        class={cn("stroke-aps1", isHovering ? "stroke-abg" : "")}
      />
    </div>
  </HoverableElement>
</button>
