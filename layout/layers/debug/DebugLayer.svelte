<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import {
    appStore,
    tailwindTheme,
    userPreferences,
    windowObject
  } from "$lib/tidy/stores/app.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { runDboUpdate } from "$lib/tidy/utils/account.utils";
  import { onMount } from "svelte";
  import DebugInfoItem from "./DebugInfoItem.svelte";
  import { ButtonVariant } from "$lib/tidy/types/button.type";
  import { runAction } from "$lib/tidy/utils/utils";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  let environment: string;
  let isShowDebugOverlay: boolean = false;
  let isShowLogs: boolean = false;
  let isDboUpdateInProgress: boolean = false;
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
    class="absolute bottom-20 right-0 flex flex-col gap-2 p-10 bg-bgs3 text-fgs1 rounded-lg z-50"
  >
    <button
      class="absolute top-0 right-0 flex flex-col p-1 bg-bgs3 text-fgs1 rounded-lg z-50"
      on:click={() => (isShowDebugOverlay = false)}
    >
      <Icon icon="minus-circled" />
    </button>
    <DebugInfoItem label="Launch context" value={$appStore.launchContext} />
    <DebugInfoItem label="Host" value={window.location.host} />
    <DebugInfoItem label="Path" value={window.location.pathname} />
    <DebugInfoItem
      label="Dimensions (W x H)"
      value={$windowObject.documentWidth + " x " + $windowObject.documentHeight}
    />
    <DebugInfoItem
      label="Landscapiness"
      value={$windowObject.landscapiness.toFixed(2)}
    />
    <DebugInfoItem label="Scale" value={$windowObject.scale.toFixed(2)} />
    <DebugInfoItem label="Theme" value={$tailwindTheme} />
    <DebugInfoItem
      label="Portrait mode"
      value={$windowObject.isInPortraitMode}
    />
    <DebugInfoItem
      label="Last run change id"
      value={$userPreferences.lastRunChangeId}
    />
    <Button
      width="w-full"
      type={ButtonVariant.PRIMARY}
      on:click={() => {
        isShowLogs = true;
        isShowDebugOverlay = false;
      }}
      icon="list"
      label="Show logs"
    />
    <Button
      width="w-full"
      isLoading={isDboUpdateInProgress}
      on:click={async () => {
        isDboUpdateInProgress = true;
        await runDboUpdate(
          $userPreferences.lastRunChangeId
            ? $userPreferences.lastRunChangeId - 1
            : 1
        );
        isDboUpdateInProgress = false;
      }}
      icon="sync"
      label="Rerun dbo update"
    />
    <Button
      width="w-full"
      icon="play"
      on:click={() => {
        runAction(AppEvent.MANUAL_RUN_DBO);
      }}
      label="Run manual dbo update"
    />
    <Button
      width="w-full"
      on:click={() => {
        isShowDebugOverlay = false;
      }}
      label="Close"
    />
  </div>
{:else}
  <button
    class="absolute bottom-20 right-0 flex flex-col p-4 bg-bgs3 opacity-50 text-fgs1 rounded-lg z-50"
    on:click={() => (isShowDebugOverlay = true)}
  >
    <Icon icon="code" />
  </button>
{/if}
{#if isShowLogs}
  <div
    class="absolute top-10 left-4 flex flex-col w-3/4 h-3/4 p-10 bg-bgs3 text-fgs1 rounded-lg z-50"
  >
    <button
      class="absolute top-0 right-0 flex flex-col p-1 bg-bgs3 text-fgs1 rounded-lg z-50"
      on:click={() => (isShowLogs = false)}
    >
      <Icon icon="minus-circled" />
    </button>
    <div class="flex flex-col gap-2 overflow-y-auto">
      {#if $appStore.debugLogs && $appStore.debugLogs.length > 0}
        {#each $appStore.debugLogs as log}
          <div>{log.type.toUpperCase()} -- {log.message}</div>
        {/each}
      {:else}
        <div>No logs</div>
      {/if}
    </div>
  </div>
{/if}
{#if environment}
  <div class="fixed right-0 top-20 text-bgs1 z-50 w-20 px-2 bg-a1 opacity-30">
    {environment}
  </div>
{/if}
