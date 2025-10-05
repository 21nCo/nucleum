<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let logs: string[] = [];
  export let isShowLogs = import.meta.env.DEV;
  const copy = () => {
    navigator.clipboard.writeText(logs.join("\n"));
  };
</script>

{#if isShowLogs}
  <div
    class="flex flex-col gap-1 text-b4 text-fgs3 p-2 max-h-96 overflow-y-auto"
  >
    <div>
      <Button label="copy" on:click={copy} size={Size.sm} />
    </div>
    <slot />
    <br />
    {#each logs as log, index (index)}
      <span class="text-wrap">
        ->
        {log}
      </span>
    {/each}
  </div>
{/if}
