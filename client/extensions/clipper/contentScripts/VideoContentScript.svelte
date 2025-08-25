<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { onMount } from "svelte";
  import { webpage } from "./store";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { cn } from "$lib/client/utils/ui.utils";
    
  let clips: any[] = [];
  let activeClipId: string | undefined = undefined;

  function refreshTimestamps() {
    const allClips = $webpage.clips;
    logger.debug({ at: "refreshTimestamps", allClips });
    if (allClips && allClips.length > 0) {
      const timestamps = allClips.filter(
        (clip) => clip.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP
      );
      clips = timestamps.sort((a, b) => a.body.timestamp - b.body.timestamp);
    }
  }

  onMount(() => {
    refreshTimestamps();
    const sub = appEvents.subscribe(async (x) => {
      if (x.event === ClipperExtensionEvent.REFRESH_CLIPS_RENDERING) {
        logger.debug({
          at: "YoutubeContentScript - onMessage - REFRESH_CLIPS_RENDERING",
          event: x.event
        });
        setTimeout(() => {
          refreshTimestamps();
        }, 1000);
      }
    });
    return () => {
      sub();
    };
  });
</script>

<div class="flex w-full h-16 items-center rounded-md bg-bgs2 border border-brs2">
    <button class="flex justify-center items-center px-3 h-full hover:bg-bgs3 border-r border-r-brs2 rounded-l-md">
        <Icon icon="mynaui:plus-hexagon" />
    </button>
    <button class="flex justify-center items-center px-3 h-full hover:bg-bgs3 border-r border-r-brs2">
        <Icon icon="widen" />
    </button>
    <div class="whitespace-nowrap px-4 h-full flex items-center border-r border-r-brs2">
        {clips.length} clips
    </div>

    <div class="timeline flex items-center overflow-x-auto w-full h-full">
        {#each clips as clip, index}
        <button class={cn("relative timeline-item flex flex-col justify-center py-1 h-full truncate px-6 hover:bg-bgs3 hover:scale-105 transition-all duration-300", {
            "pl-12": index === 0,
            "min-w-64 w-64 bg-bgs3": activeClipId === clip.id,
            "min-w-48 w-48": activeClipId !== clip.id,
        })}
        on:click={() => activeClipId = clip.id}
        title='Click for options, click timestamp to seek'
        >
            <button class="text-b3 px-1 py-0.5 bg-bgs3 rounded-md tabular-nums z-10 w-fit hover:bg-bgs4 transition-all duration-300 hover:before:content-['⏩︎']"
            title="Seek to this timestamp"
            >
                {formatSeconds(clip.body.timestamp, TimeFormat.CLOCK)}
            </button>
            <div class="text-b2 text-start line-clamp-1 truncate">
                {clip.label || "Untitled"}
            </div>
        </button>
        {/each}
    </div>
</div>

<style>
    .timeline-item::before {
        content: "";
        position: absolute;
        border-bottom: 1px solid rgb(var(--colors-bgs4));
        top: 0;
        left: 0;
        height: 30%;
        width: 100%;
        z-index: 0;
    }
</style>