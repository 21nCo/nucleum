<script lang="ts">
  import { onMount } from "svelte";
  import LogItem from "./ManualLogItem.svelte";
  import { postMessageToParent } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { pointLogStore } from "../log.store";

  onMount(() => {
    postMessageToParent(EmbedMessage.SHEET_MOUNTED);
    if ($pointLogStore.manualLogs.length === 0) {
      pointLogStore.addNewManualLog();
    }
  });
</script>

<div class="flex flex-col gap-6 w-full grow overflow-y-auto">
  <div class="flex flex-col gap-8 w-full mt-4">
    {#if $pointLogStore?.manualLogs && $pointLogStore.manualLogs.length > 0}
      {#each $pointLogStore.manualLogs as item}
        <LogItem {item} />
      {/each}
    {/if}
  </div>
  <div class="flex w-full justify-center">
    <Button
      label="Add another entry"
      icon="plus"
      on:click={() => pointLogStore.addNewManualLog()}
    />
  </div>
</div>
