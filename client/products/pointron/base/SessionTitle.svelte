<script lang="ts">
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { TimeFormat } from "$lib/client/types/time.type";

  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { activeSession } from "../focus/session.store";
  import { Product } from "$lib/client/products/product.type";
  import { resolveProductConfig } from "$lib/client/products/product.config";
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
        - {resolveProductConfig(ctx).displayName}
      </title>
    {/key}
  {:else}
    <title>
      {resolveProductConfig(ctx).displayName} - {resolveProductConfig(ctx)
        .tagline}
    </title>
  {/if}
</svelte:head>

<div
  id="focusData"
  data-focus-active={$activeSession.isSessionRunning}
  data-focus-time-elapsed={$activeSession.timeElapsed}
  data-focus-state={$activeSession.state}
></div>
