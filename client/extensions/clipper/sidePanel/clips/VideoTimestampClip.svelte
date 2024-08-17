<script lang="ts">
  import type { IVideoTimestampClip } from "$lib/client/products/memotron/node/node.type";

  export let clip: IVideoTimestampClip;

  /**
   * TODO - use time.utils.ts from lib
   * @param seconds
   */
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result = "";
    if (hrs > 0) {
      result += `${hrs}:`;
    }
    result += `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    return result;
  }
</script>

<div class="yt-timestamps">
  <div role="button" tabindex="0" on:click on:keydown style="cursor: pointer;">
    <img
      class="thumbnail"
      src="https://placehold.co/600x400"
      alt="Video Thumbnail"
    />
    <div class="timestamp">{formatTime(clip.body.timestamp)}</div>
  </div>
</div>
