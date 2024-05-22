<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { CaptureType } from "$lib/tidy/types/memotron/capture.type";
  import VerticalSwitcherItem from "$lib/tidy/elements/switcher/VerticalSwitcherItem.svelte";
  import {
    VerticalSwitcherStyle,
    type SwitchItem
  } from "$lib/tidy/types/switcher.enum";
  import { Direction } from "$lib/tidy/types/direction.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { captureStore } from "$lib/tidy/components/memotron/capture/capture.store";
  const captureTypes: SwitchItem[] = [
    // { label: CaptureType.ANY, icon: "cube" },
    { label: CaptureType.MARKDOWN },
    { label: CaptureType.AUDIO, icon: "microphone" },
    { label: CaptureType.CAMERA, icon: "camera" },
    { label: CaptureType.UPLOAD, icon: "upload" }
  ];
  const dispatch = createEventDispatcher();
</script>

<aside class="flex flex-col h-full items-center justify-center">
  {#each captureTypes as item}
    <VerticalSwitcherItem
      {item}
      activeStatusPlacement={Direction.Right}
      style={VerticalSwitcherStyle.BAR}
      isActive={$captureStore.captureType === item.label}
      size={Size.lg}
      on:click={() => {
        $captureStore.captureType = item.label;
        dispatch("switch");
      }}
    >
      {#if item.label === CaptureType.MARKDOWN}
        <div class="text-h5 font-bold rounded-md px-2 py-1">M↓</div>
      {/if}
    </VerticalSwitcherItem>
  {/each}
</aside>
