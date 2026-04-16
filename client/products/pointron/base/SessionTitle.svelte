<script lang="ts">
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import { TimeFormat } from "@21n/types/time.type";

  import { formatSeconds } from "@21n/utils/time.utils";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { Product } from "@21n/products/product.type";
  import { resolveProductConfig } from "@21n/products/product.config";

  let { ctx = Product.NUCLEUS }: { ctx?: Product } = $props();
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
