<script lang="ts">
  import {
    SessionCompositionType,
    type SessionComposition
  } from "$lib/client/types/pointron/sessionComposition.type";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  export let preset: SessionComposition;
  export let isExpandedVariant: boolean;
  export let parentBackgroundIndex: number;
  export let isActive: boolean;
</script>

{#if preset.type === SessionCompositionType.POMODORO && preset.numberOfFocusRounds}
  <div class="flex text-b3 gap-4">
    <div class="flex {!isActive && 'text-aps1'}">
      {isExpandedVariant ? "Focus:" : "F:"}&nbsp;
      {#if preset.numberOfFocusRounds > 1}
        <div>
          {preset.numberOfFocusRounds}&nbsp;x&nbsp;
        </div>
      {/if}
      <div class="flex gap-1 items-center">
        <!-- <div>
          {padToTwo(
            preset.focusDuration > 60
              ? preset.focusDuration / 60
              : preset.focusDuration
          )}
        </div> -->
        <div>
          {formatSeconds(preset.focusDuration)}
        </div>
        {#if preset.additional && preset.additional.length > 0}
          <BackgroundElement
            class="flex items-center text-b4 rounded-sm px-1 text-aps1"
            parentBgIndex={parentBackgroundIndex}
          >
            <div>+</div>
            <div>
              {preset.additional.length}
            </div>
          </BackgroundElement>
        {/if}
      </div>
    </div>
    {#if isExpandedVariant}
      <div class="flex {!isActive && 'text-ass1'}">
        Break:&nbsp;
        {formatSeconds(preset.breakDuration)}
      </div>
    {/if}
  </div>
{:else if preset.type === SessionCompositionType.TARGET_FOCUS}
  <div class="flex text-b3">
    <div>
      {isExpandedVariant ? "Focus target:" : "F:"}&nbsp;
      {formatSeconds(preset.focusDuration)}
    </div>
  </div>
{:else if preset.type === SessionCompositionType.TOTAL_DURATION}
  <div class="flex text-b3">
    <div>
      {isExpandedVariant ? "Total:" : "T:"}&nbsp;
      {formatSeconds(preset.totalDuration)}
    </div>
  </div>
{/if}
