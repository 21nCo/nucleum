<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { onMount } from "svelte";
  let environment: string;
  let isShowDebugOverlay: boolean = false;
  let isShowLogs: boolean = false;
  onMount(() => {
    if ($appStore.launchContext) {
      if ($appStore.launchContext == LaunchContext.PREVIEW)
        environment = "Preview";
      else if ($appStore.launchContext == LaunchContext.DEV)
        environment = "Dev";
      else if ($appStore.launchContext == LaunchContext.EMBED)
        environment = "Embed";
    }
  });
</script>

{#if isShowDebugOverlay}
  <div
    class="absolute bottom-20 right-0 flex flex-col gap-4 p-10 bg-bgs4 text-fgs1 rounded-lg z-50"
  >
    <button
      class="absolute top-0 right-0 flex flex-col p-1 bg-bgs4 text-fgs1 rounded-lg z-50"
      on:click={() => (isShowDebugOverlay = false)}
    >
      <Icon icon="minus-circled" />
    </button>
    <div>
      {"Dimensions (W x H): " +
        $windowObject.documentWidth +
        "x" +
        $windowObject.documentHeight}
    </div>
    <div>
      {"Landscapiness: " + $windowObject.landscapiness.toFixed(2)}
    </div>
    <div>
      {"Is in portriat mode: " + $windowObject.isInPortraitMode}
    </div>
    <div>
      {"Scale: " + $windowObject.scale.toFixed(2)}
    </div>
    <div>
      {"Theme: " + $appStore.tailwindTheme}
    </div>
    <button
      class="w-full border border-fgs1 rounded-lg p-2"
      on:click={() => {
        isShowLogs = true;
        isShowDebugOverlay = false;
      }}
    >
      Show debug logs
    </button>
  </div>
{:else}
  <button
    class="absolute bottom-20 right-0 flex flex-col p-4 bg-bgs4 opacity-50 text-fgs1 rounded-lg z-50"
    on:click={() => (isShowDebugOverlay = true)}
  >
    <Icon icon="code" />
  </button>
{/if}
{#if isShowLogs}
  <div
    class="absolute top-10 left-4 flex flex-col w-3/4 h-3/4 p-10 bg-bgs4 text-fgs1 rounded-lg z-50"
  >
    <button
      class="absolute top-0 right-0 flex flex-col p-1 bg-bgs4 text-fgs1 rounded-lg z-50"
      on:click={() => (isShowLogs = false)}
    >
      <Icon icon="minus-circled" />
    </button>
    <div class="flex flex-col gap-2">
      {#if $appStore.debugLogs && $appStore.debugLogs.length > 0}
        {#each $appStore.debugLogs as log}
          <div>{log.message}</div>
        {/each}
      {:else}
        <div>No logs</div>
      {/if}
    </div>
  </div>
{/if}
{#if environment}
  <div
    class="fixed right-0 top-20 text-bgs1 z-50 w-20 px-2 bg-accent1 opacity-30"
  >
    {environment}
  </div>
{/if}
