<script lang="ts">
  import Button from "@21n/elements/button/Button.svelte";
  import { Size } from "@21n/types/size.enum";
  import { logger } from "@21n/components/debug/logger.client";

  export let logs: string[] = [];
  export let isShowLogs = import.meta.env.DEV;
  const copy = async () => {
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(logs.join("\n"));
    } catch (error) {
      logger.error({ at: "SheetDebugLogs.copy", error });
    }
  };
</script>

{#if isShowLogs}
  <div
    class="flex flex-col gap-1 text-b4 text-fgs3 p-2 max-h-96 overflow-y-auto"
    role="log"
    aria-live="polite"
    aria-label="Share sheet debug logs"
  >
    <div>
      <Button
        label="copy"
        aria-label="Copy debug logs"
        on:click={copy}
        size={Size.sm}
      />
    </div>
    <slot />
    <ul class="flex flex-col gap-1" role="list">
      {#each logs as log, index (index)}
        <li class="text-wrap">
          ->
          {log}
        </li>
      {/each}
    </ul>
  </div>
{/if}
