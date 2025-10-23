<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "@21n/types/notification.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";

  export let feedback: IInlineStatus | string | undefined = undefined;
  export let isRenderEmptyHeight = false;
  export let isAutoDissappear: boolean = true;
  export let size: Size.md | Size.sm = Size.md;
  let timer: any;
  $: if (feedback && isAutoDissappear) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      feedback = undefined;
    }, 4000);
  }
</script>

{#if feedback}
  <div
    class={cn("flex items-center gap-1 w-full justify-center h-4", {
      "text-fgs3": typeof feedback === "string",
      "text-ags1":
        typeof feedback != "string" && feedback?.type === AlertType.SUCCESS,
      "text-ars1":
        typeof feedback != "string" && feedback?.type === AlertType.ERROR,
      "text-b2": size === Size.md,
      "text-b3": size === Size.sm
    })}
  >
    {#if typeof feedback === "object"}
      {#if feedback?.type === AlertType.PROGRESS}
        <Icon icon="svg-spinners:90-ring-with-bg" size={Size.xs} />
      {:else if feedback?.type === AlertType.SUCCESS}
        <Icon icon="ph:check-circle" size={Size.xs} class="text-ags1" />
      {:else if feedback?.type === AlertType.ERROR}
        <Icon icon="ph:x-circle" size={Size.xs} class="text-ars1" />
      {/if}
    {/if}
    <span>
      {typeof feedback == "string" ? feedback : feedback.message}
    </span>
  </div>
{:else if isRenderEmptyHeight}
  <div class="h-4"></div>
{/if}
