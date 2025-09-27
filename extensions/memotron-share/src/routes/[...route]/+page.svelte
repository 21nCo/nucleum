<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { page } from "$app/stores";
  import { pingParent } from "$lib/client/utils/embed.utils";
  import { onMount } from "svelte";

  let currentPath = $page?.params?.route;
  let data: any;
  let debugLog: string[] = [];

  async function handleMessageFromParent(event: any) {
    try {
      if (event?.data?.type === "SWIFT_MESSAGE") {
        addToDebugLog("Received message from parent");
        if (event?.data?.payload) {
          const parsed = JSON.parse(event.data.payload);
          data = parsed;
        }
      }
    } catch (e) {}
  }
  onMount(() => {
    addToDebugLog("Mounted");
    pingParent();
    addToDebugLog("Pinged parent");
  });

  function addToDebugLog(log: string) {
    debugLog = [...debugLog, log];
  }
</script>

<div
  class="w-full h-full flex flex-col gap-2 p-2 bg-bgs1 text-base text-fgs1 overflow-y-auto"
>
  <div class="flex gap-1">
    <Icon icon="share" />
    Memotron share
  </div>
  <div class="flex flex-col gap-1 text-fgs3">
    {#each debugLog as log, index (index)}
      <span class="text-wrap">
        ->
        {log}
      </span>
    {/each}
  </div>
  {#if data}
    {JSON.stringify(data)}
  {/if}
</div>
<svelte:window on:message={handleMessageFromParent} />
