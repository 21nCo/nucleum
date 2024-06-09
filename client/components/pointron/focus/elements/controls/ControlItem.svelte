<script lang="ts">
  import Extend from "$lib/client/icons/Extend.svelte";
  import { Control } from "$lib/client/types/pointron/control.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { pointronPreferences } from "$lib/client/components/pointron/pointron.store";
  import { Size } from "$lib/client/types/size.enum";
  import {
    customColorStyle,
    resolveIfActiveFgFg
  } from "$lib/client/utils/theme.utils";
  import { userPreferences } from "$lib/client/stores/app.store";
  import { ColorType } from "$lib/client/types/appearance.type";
  import ControlIcon from "./ControlIcon.svelte";
  import { sessionStore } from "$lib/client/components/pointron/focus/session.store";
  import appearance from "$lib/client/stores/appearance.store";
  export let control: Control;
  export let color: number | undefined = undefined;
  export let isProminent: boolean = false;
  export let contextSize: Size = Size.md;
  export let width: number = 68;
  $: extendDuration = $pointronPreferences.extendDuration;
  let timer: any;
  const dispatch = createEventDispatcher();
  function clickHandler() {
    dispatch("click", { control });
  }
  onMount(() => {
    width = contextSize === Size.md ? 68 : 48;
    //todo - later - causing flickering of the screen
    // if (isProminent) {
    //   ringStyles = "w-14 h-14 opacity-80";
    //   timer = setInterval(() => {
    //     zoomed = !zoomed;
    //     ringStyles = zoomed
    //       ? "w-24 h-24 opacity-0 transition-all duration-500"
    //       : "w-14 h-14 opacity-80";
    //   }, 600);
    // } else {
    //   clearInterval(timer);
    // }
    return () => {
      clearInterval(timer);
    };
  });
</script>

<button
  on:click={(event) => {
    clickHandler();
    event.stopPropagation();
  }}
  class="relative"
>
  <div
    class="relative {contextSize === Size.lg || contextSize === Size.xl
      ? 'w-20 h-20'
      : contextSize === Size.md
        ? `w-16 h-16`
        : 'w-12 h-12 border'} rounded-full flex items-center justify-center {contextSize ===
      Size.sm &&
    resolveIfActiveFgFg($sessionStore.currentLog.color, $appearance)
      ? 'border-fgs1'
      : 'border-bgs1'}"
    style={contextSize != Size.sm
      ? customColorStyle(
          $appearance,
          ColorType.Bg,
          control === Control.BREAK
            ? "ass1"
            : control === Control.ABANDON
              ? "bgs4"
              : control === Control.RESUME
                ? "ags1"
                : "aps1",
          color
        )
      : ""}
  >
    {#if control === Control.START || control === Control.RESUME || control === Control.SKIPBREAK}
      <!-- <Start {width} /> -->
      <ControlIcon
        icon={contextSize === Size.sm ? "play-circled-mini" : "play-circled"}
        {contextSize}
      />
    {:else if control === Control.BREAK}
      <ControlIcon
        icon={contextSize != Size.sm ? "clock" : "clock-mini"}
        {contextSize}
      />
      <!-- <Break {width} /> -->
    {:else if control === Control.EXTEND}
      <Extend {width} minutes={extendDuration} />
    {:else if control === Control.FINISH}
      <!-- <Finish {width} /> -->
      <ControlIcon
        icon={contextSize != Size.sm
          ? "arrow-right-circled"
          : "arrow-right-circled-mini"}
        {contextSize}
      />
    {:else if control === Control.ABANDON}
      <ControlIcon
        icon={contextSize != Size.sm ? "cross" : "cross-mini"}
        {contextSize}
      />
    {/if}
    {#if isProminent}
      <!-- <div
        class={`absolute rounded-full border-2  ${ringStyles}`}
        style="border-color: rgba(var(--colors-{color}))"
      /> -->
    {/if}
  </div>
  {#if contextSize != Size.sm}
    <div
      class="absolute top-full left-0 text-fgs2 self-center flex w-full justify-center"
    >
      {#if control === Control.START}
        Start
      {:else if control === Control.RESUME}
        Resume
      {:else if control === Control.SKIPBREAK}
        Skip break
      {:else if control === Control.BREAK}
        Break
      {:else if control === Control.EXTEND}
        Extend
      {:else if control === Control.FINISH}
        Finish
      {:else if control === Control.ABANDON}
        Abandon
      {/if}
    </div>
  {/if}
</button>
