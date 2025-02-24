<script lang="ts">
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import {
    BlockType,
    SessionUIContext
  } from "$lib/client/types/pointron/session.type";
  import { currentTime } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import view from "$lib/client/stores/view.store";
  import { formatTime } from "$lib/client/utils/time.utils";
  export let progress: number = 0;
  export let color: string | undefined = undefined;
  export let type: BlockType = BlockType.FOCUS;
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let isActiveProgress: boolean;
  let barClassList: string;
  let activeBarRef: any;
  let xPosition: any;
  let yPositon: any;
  $: barClassList =
    "z-10 h-full rounded-full " +
    (color
      ? `bg-[${color}]`
      : type === BlockType.FOCUS
        ? "bg-aps1"
        : "bg-ass1");
  $: {
    if (progress != 0 && progress != 1) {
      isActiveProgress = true;
      const rect = activeBarRef?.getBoundingClientRect();
      xPosition = rect?.right;
      yPositon = rect?.y;
    } else {
      isActiveProgress = false;
    }
  }
</script>

<div
  class="w-full rounded-full bg-bgs4 overflow-hidden mb-1 {context ===
  SessionUIContext.ZEN_ON_DESKTOP
    ? 'h-2'
    : 'h-1'}"
>
  <!-- <div class="absolute bg-bgs4 w-full h-full" /> -->
  <div
    class={barClassList}
    style="width: {progress * 100}%"
    bind:this={activeBarRef}
  >
    {#if context !== SessionUIContext.PIP && $activeSession.isSessionRunning && isActiveProgress && xPosition && yPositon && xPosition > 0 && yPositon > 0}
      <div
        class="fixed text-b3 rounded-md flex justify-center items-center min-w-fit px-1 {context ===
        SessionUIContext.ZEN_ON_DESKTOP
          ? 'bg-bgs3 text-fgs2 text-b3 h-6'
          : 'bg-bgs2 text-fgs3 text-b4 h-4'}"
        style="left: calc({xPosition}px - {$view.isPortrait
          ? '24px'
          : '28px'}); top: calc({yPositon}px - {$view.isPortrait
          ? '20px'
          : '30px'})"
      >
        {formatTime($userPreferences, $currentTime)}
      </div>
    {/if}
  </div>
</div>
