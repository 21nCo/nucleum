<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import Icon from "$lib/client/elements/Icon.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { webpage } from "./store";
  import { extractTweet } from "../clipper.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  let isSaved: boolean = false;
  let isHovering: boolean = false;
  async function onClick(event) {
    const tweetNode = extractTweet(event.target);
    if (!tweetNode) {
      logger.error("Tweet node not found");
      return;
    }
    await webpage.saveTweet(tweetNode);
    isSaved = true;
  }
</script>

<button class="mr-4" on:click|stopPropagation={onClick}>
  <HoverableElement
    tooltip={isSaved ? "Saved to Memotron" : "Save to Memotron"}
    tooltipOptions={{
      isUseAbsolutePositioning: true,
      placement: Placement.TopCenter
    }}
    bind:isHovering
    class="flex justify-center items-center rounded-sm bg-aps2 hover:bg-aps1"
  >
    <Icon
      icon={isSaved ? "check-circle" : "plus"}
      size={Size.md}
      class={cn("stroke-aps1", isHovering ? "stroke-abg" : "")}
    />
  </HoverableElement>
</button>
