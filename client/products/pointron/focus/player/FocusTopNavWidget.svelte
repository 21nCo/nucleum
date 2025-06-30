<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { activeSession } from "../session.store";
  import { TimeFormat } from "$lib/client/types/time.type";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { tooltip } from "$lib/client/actions/popover.action";
  import { cn } from "$lib/client/utils/ui.utils";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { Product } from "$lib/client/types/product.type";
  export let ctx: Product = Product.NUCLEUS;
  const action =
    ctx === Product.NUCLEUS ? PointronAction.FOCUS : PointronAction.FOCUS_MODAL;
  function handleClick() {
    appStore.runAction(action);
  }
</script>

{#if $activeSession.isSessionRunning}
  <button
    class={cn(
      "flex items-center tabular-nums text-b3 font-mono border hover:bg-bgs3 py-1 px-2 rounded-md",
      {
        "text-aps1 border-aps1":
          $activeSession.state === SessionState.FOCUS_RUNNING,
        "text-ass1 border-ass1":
          $activeSession.state === SessionState.BREAK_RUNNING
      }
    )}
    on:click={handleClick}
    use:tooltip={{
      text: "Open focus"
    }}
  >
    {formatSeconds($activeSession.timeElapsed, TimeFormat.CLOCK)}
  </button>
{:else}
  <Button
    icon="ph:circle"
    tooltip="Focus"
    style={ButtonStyle.PLAIN}
    shortcut={action}
    parentBgIndex={2}
    on:click={handleClick}
  />
{/if}
