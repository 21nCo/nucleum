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
  import { AlertType } from "$lib/client/types/notification.type";

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
      if (isSaved) {
        webpage.focus(tweetNode.url, {
          message: "Tweet already saved!",
          type: AlertType.SUCCESS
        });
        isSaving = false;
        return;
      }
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

<svg width="0" height="0" class="absolute">
  <defs>
    <clipPath id="rounded-hexagon" clipPathUnits="objectBoundingBox">
      <path
        d="M0.02,0.25 Q0.02,0.27 0.04,0.27 L0.46,0.04 Q0.5,0.02 0.54,0.04 L0.96,0.27 Q0.98,0.27 0.98,0.25 L0.98,0.75 Q0.98,0.73 0.96,0.73 L0.54,0.96 Q0.5,0.98 0.46,0.96 L0.04,0.73 Q0.02,0.73 0.02,0.75 Z"
      />
    </clipPath>
  </defs>
</svg>

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
    class="relative flex justify-center items-center"
  >
    <div
      class={cn("absolute inset-0 -ml-1.5 -mt-1 rounded-full w-8 h-8 bg-aps2", {
        "opacity-0": !isHovering
      })}
    ></div>
    <div
      use:hoverable={{
        onHover: (val) => (isHovering = val)
      }}
      class={cn(
        "flex justify-center items-center p-0.5 py-1 [clip-path:url(#rounded-hexagon)] hover:scale-105 transition-all duration-100",
        {
          "bg-aps1": isSaved,
          "bg-aps2 hover:bg-aps1": !isSaved
        }
      )}
    >
      <Icon
        icon={isSaving
          ? "svg-spinners:3-dots-fade"
          : isSaved
            ? "ph:check"
            : "plus"}
        size={isSaved ? Size.xs : Size.sm}
        class={cn({
          "fill-abg": isHovering || isSaved,
          "fill-aps1": !isHovering && !isSaved
        })}
      />
    </div>
  </HoverableElement>
</button>
