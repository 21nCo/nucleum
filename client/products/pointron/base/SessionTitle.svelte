<script lang="ts">
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { TimeFormat } from "$lib/client/types/time.type";

  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { activeSession } from "../focus/session.store";
  import { Product } from "$lib/client/types/product.type";
  export let ctx: Product = Product.NUCLEUS;
</script>

<svelte:head>
  {#if $activeSession.isSessionRunning}
    {#key $activeSession.timeElapsed}
      <title>
        {$activeSession.state === SessionState.FOCUS_RUNNING
          ? "Focus"
          : "Break"}: {formatSeconds(
          $activeSession.timeElapsed,
          TimeFormat.CLOCK
        )}
        - {ctx === Product.POINTRON ? "Pointron" : "Nucleus"}
      </title>
    {/key}
  {:else}
    <title>
      {ctx === Product.POINTRON
        ? "Pointron - Your focus haven"
        : "Nucleus - Your digital harmony"}
    </title>
  {/if}
</svelte:head>

<div
  id="focusData"
  data-focus-active={$activeSession.isSessionRunning}
  data-focus-time-elapsed={$activeSession.timeElapsed}
  data-focus-state={$activeSession.state}
></div>
