<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import Icon from "$lib/client/elements/Icon.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { webpage } from "./store";
  import { extractTweet } from "../clipper.utils";
  let isSaved: boolean = false;

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

<button class="mr-2 mt-1" on:click|stopPropagation={onClick}>
  <HoverableElement
    tooltip={isSaved ? "Saved to Memotron" : "Save to Memotron"}
    tooltipOptions={{
      isUseAbsolutePositioning: true,
      placement: Position.TopCenter
    }}
    class="flex justify-center items-center p-1 rounded-md hover:bg-fgs3 dark:hover:bg-bgs3"
  >
    <Icon
      icon={isSaved ? "check-circle" : "plus"}
      size={Size.lg}
      class="stroke-bgs1 dark:stroke-fgs1"
    />
  </HoverableElement>
</button>
