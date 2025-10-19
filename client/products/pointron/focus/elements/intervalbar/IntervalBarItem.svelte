<script lang="ts">
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import {
    BlockType,
    SessionUIContext
  } from "@21n/types/pointron/session.type";
  import { currentTime } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import view from "@21n/stores/view.store";
  import { formatTime } from "@21n/utils/time.utils";
  import { cn } from "@21n/utils/ui.utils";
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
        class={cn(
          "fixed text-b3 rounded-md flex justify-center items-center min-w-fit px-1",
          {
            "bg-bgs4 text-fgs2 text-b3 h-5":
              context === SessionUIContext.ZEN_ON_DESKTOP,
            "bg-bgs3 text-fgs3 text-b4 h-4":
              context !== SessionUIContext.ZEN_ON_DESKTOP
          }
        )}
        style="left: calc({xPosition}px - {$view.isPortrait
          ? '24px'
          : '28px'}); top: calc({yPositon}px - {$view.isPortrait
          ? '20px'
          : '30px'})"
      >
        {formatTime($userPreferences, $currentTime)}
        <svg
          width="16"
          height="10"
          viewBox="0 0 16 10"
          class="absolute -bottom-[5px] left-1/2 -translate-x-1/2 rotate-180"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 7C2 7 4.5 7 8 7C11.5 7 14 7 14 7L8 1L2 7Z"
            class={cn({
              "fill-bgs4": context === SessionUIContext.ZEN_ON_DESKTOP,
              "fill-bgs3": context !== SessionUIContext.ZEN_ON_DESKTOP
            })}
            stroke-width="1.2"
            stroke-linejoin="round"
          />
        </svg>
      </div>
    {/if}
  </div>
</div>
