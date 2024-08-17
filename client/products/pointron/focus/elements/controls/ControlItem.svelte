<script lang="ts">
  import Extend from "$lib/client/icons/Extend.svelte";
  import { Control } from "$lib/client/types/pointron/control.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import ControlIcon from "./ControlIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { sessionStore } from "../../session.store";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  export let control: Control;
  export let isProminent: boolean = false;
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  $: iconProps = { context };
  $: extendDuration = $pointronPreferences.extendDuration;
  let timer: any;
  const dispatch = createEventDispatcher();
  function clickHandler() {
    dispatch("click", { control });
  }
  $: isBreakReminderMode =
    $sessionStore.timeRemainingToTakeBreak != undefined &&
    $sessionStore.timeRemainingToTakeBreak < 0;
  onMount(() => {
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
    class={cn(
      "relative rounded-full flex items-center justify-center",
      {
        "w-20 h-20 mo:w-16 mo:h-16 hover:bg-opacity-80":
          context === SessionUIContext.DEFAULT,
        "w-12 h-12 hover:bg-opacity-80": context === SessionUIContext.PIP
      },
      context === SessionUIContext.FOCUS_PLAYER && {
        "w-12 h-12 border": true,
        "border-cbg":
          $sessionStore.state == SessionState.FOCUS_RUNNING &&
          !isBreakReminderMode,
        "border-abg":
          $sessionStore.state != SessionState.FOCUS_RUNNING ||
          isBreakReminderMode
      },
      context !== SessionUIContext.FOCUS_PLAYER && {
        "bg-ass1": control === Control.BREAK,
        "bg-fgs4": control === Control.ABANDON,
        "bg-ags1": control === Control.RESUME,
        "bg-aps1":
          control === Control.START ||
          control === Control.SKIPBREAK ||
          control === Control.FINISH
      }
    )}
  >
    {#if control === Control.START || control === Control.RESUME || control === Control.SKIPBREAK}
      <!-- <Start {width} /> -->
      <ControlIcon icon="play-circled" {...iconProps} />
    {:else if control === Control.BREAK}
      <ControlIcon icon="clock" {...iconProps} />
      <!-- <Break {width} /> -->
    {:else if control === Control.EXTEND}
      <Extend minutes={extendDuration} />
    {:else if control === Control.FINISH}
      <!-- <Finish {width} /> -->
      <ControlIcon icon="arrow-right-circled" {...iconProps} />
    {:else if control === Control.ABANDON}
      <ControlIcon icon="cross" {...iconProps} />
    {/if}
    {#if isProminent}
      <!-- <div
        class={`absolute rounded-full border-2  ${ringStyles}`}
        style="border-color: rgba(var(--colors-{color}))"
      /> -->
    {/if}
  </div>
  {#if context === SessionUIContext.DEFAULT}
    <div
      class="absolute top-full left-0 text-fgs2 self-center flex w-full justify-center mo:text-b3 mt-1"
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
