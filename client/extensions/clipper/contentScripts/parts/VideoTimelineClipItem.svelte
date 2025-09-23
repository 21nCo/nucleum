<script lang="ts">
  import type { IVideoTimestampClip } from "$lib/client/products/memotron/node/node.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import FileView from "$lib/client/components/files/FileView.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { webpage } from "../store";
  import { checkIfVideoPaused } from "$lib/client/extensions/clipper/parsers/shared/video.utils";
  import { pauseVideo } from "$lib/client/extensions/clipper/parsers/shared/video.utils";
  import { onMount } from "svelte";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let clip: IVideoTimestampClip;
  export let index: number;
  export let currentVideoTime: number;
  export let seek: (timestamp: number) => void;
  let elementRef: HTMLElement;
  export function scrollIntoView(timelineElement: HTMLElement) {
    try {
      const scrollLeft =
        elementRef.offsetLeft -
        timelineElement.clientWidth / 2 +
        elementRef.offsetWidth / 2;
      timelineElement.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth"
      });
    } catch (error) {
      console.error("scrollIntoView", error);
    }
  }

  onMount(() => {
    const sub = appEvents.subscribe(async (x) => {
      if (x.event === ClipperExtensionEvent.REFRESH_CLIP) {
        if (x.value?.id === clip.id) {
          clip = x.value;
        }
      }
    });

    return () => {
      sub();
    };
  });
</script>

<button
  class={cn(
    "group relative timeline-item flex gap-1 justify-start min-w-64 w-64 py-2 h-full truncate px-4 hover:bg-bgs3 transition-all duration-300",
    {
      "pl-12": index === 0,
      past: currentVideoTime > clip.body.timestamp,
      future: currentVideoTime < clip.body.timestamp
    }
  )}
  bind:this={elementRef}
  on:click={() => {
    seek(clip.body.timestamp);
  }}
  title="Click to seek"
>
  <button
    class={cn("relative z-10 w-fit bg-bgs2 rounded-md", {
      "border border-brs2": clip.body.thumbnail
    })}
  >
    {#if clip.body.thumbnail}
      <FileView
        id={clip.body.thumbnail}
        class="thumbnail h-full object-cover w-16 min-w-16 rounded-md"
      />
    {/if}
    <button
      class="absolute bottom-0 inset-x-0 bg-bgs2 rounded-b-md px-1 py-0.5 w-full text-b3 tabular-nums"
    >
      {formatSeconds(clip.body.timestamp, TimeFormat.CLOCK)}
    </button>
  </button>
  <button class="flex flex-col flex-1 truncate min-w-0 h-full relative z-10">
    <div
      class={cn("text-b2 text-start line-clamp-1 truncate", {
        "text-fgs3": !clip.label
      })}
    >
      {clip.label || "Untitled"}
    </div>
    <div class="flex items-center gap-1.5 w-full">
      {#if clip.notes}
        <Icon size={Size.sm} icon="note" />
      {/if}
      {#if clip.links && clip.links.length > 0}
        <span class="flex items-center gap-0.5 text-b2 text-fgs2">
          <Icon size={Size.sm} icon="link" />
          {clip.links.length}
        </span>
      {/if}
      <button
        class="open-btn group-hover:opacity-100 opacity-0 transition-all duration-300 hover:bg-bgs1 w-fit h-fit px-1 py-0.5 rounded-md text-b3 border border-brs3"
        on:click|stopPropagation={(e) => {
          const isExplicitPause = checkIfVideoPaused();
          if (!isExplicitPause) pauseVideo();
          webpage.openInModal(clip.id, {
            isResumeVideoOnClose: !isExplicitPause
          });
        }}
      >
        Edit
      </button>
    </div>
  </button>
</button>

<style>
  .timeline-item::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    height: 80%;
    width: 100%;
    z-index: 0;
    opacity: 0.7;
  }

  .timeline-item.future::before {
    border-bottom: 1px dashed rgb(var(--colors-fgs4));
  }
  .timeline-item.past::before {
    border-bottom: 1px solid rgb(var(--colors-fgs4));
  }
</style>
