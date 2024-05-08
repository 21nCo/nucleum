<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { appStore, dboVersion } from "$lib/tidy/stores/app.store";
  import view from "$lib/tidy/stores/view.store";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { runDboUpdate } from "$lib/tidy/utils/account.utils";
  import { onMount } from "svelte";
  import DebugInfoItem from "./DebugInfoItem.svelte";
  import { ButtonVariant } from "$lib/tidy/types/button.type";
  import { runAction } from "$lib/tidy/utils/utils";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { logger } from "$lib/tidy/stores/log.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import context from "$lib/tidy/stores/context.store";
  let environment: string;
  let isShowDebugOverlay: boolean = false;
  let isShowLogs: boolean = false;
  let isDboUpdateInProgress: boolean = false;
  let storageQuota: number | undefined;
  let storageUsage: number | undefined;
  checkStorage();
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
  function checkStorage() {
    try {
      navigator.storage.estimate().then((estimate) => {
        console.log(`Using ${estimate.usage} out of ${estimate.quota} bytes.`);
        storageQuota = estimate.quota;
        storageUsage = estimate.usage;
      });
    } catch (e) {
      console.log("Storage estimate not supported");
    }
  }
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
    <DebugInfoItem
      label="Context"
      value={` isEmbed: ${$context.isEmbed}, isSheet: ${$context.isSheet}, embed: ${$context.embed}`}
    />
    <DebugInfoItem label="Host" value={window.location.host} />
    <DebugInfoItem label="Agent" value={navigator?.userAgent} />
    <DebugInfoItem label="Path" value={window.location.pathname} />
    <DebugInfoItem
      label="Dimensions (W x H)"
      value={$view.width + " x " + $view.height}
    />
    <DebugInfoItem
      label="Landscapiness"
      value={$view.landscapiness.toFixed(2)}
    />
    <DebugInfoItem label="Scale" value={$view.scale.toFixed(2)} />
    <DebugInfoItem label="Skin" value={$appearance.skin} />
    <DebugInfoItem
      label="Theme & Color scheme"
      value={$appearance.theme +
        "  " +
        $appearance.colorScheme.tailwindSelector}
    />
    <DebugInfoItem label="Typeface" value={$appearance.typeface} />
    <DebugInfoItem label="Portrait mode" value={$view.isPortrait} />
    <DebugInfoItem label="Dbo version" value={$dboVersion.version} />
    <DebugInfoItem
      label="Storage quota"
      value={storageQuota
        ? `${(storageQuota / 1000000000).toFixed(2)} GB`
        : "NA"}
    />
    <DebugInfoItem
      label="Storage used"
      value={storageUsage ? `${(storageUsage / 1000000).toFixed(2)} MB` : "NA"}
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
        await runDboUpdate($dboVersion.version);
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
    class="absolute top-10 left-4 flex flex-col w-3/4 h-3/4 p-10 bg-bgs2 text-fgs1 rounded-lg z-50 shadow-lg border border-brs1"
  >
    <button
      class="absolute top-0 right-0 flex flex-col p-1 text-fgs1 rounded-lg z-50"
      on:click={() => (isShowLogs = false)}
    >
      <Icon icon="minus-circled" size={Size.lg} />
    </button>
    <div class="flex flex-col gap-2 overflow-y-auto">
      {#if $logger.items && $logger.items.length > 0}
        {#each $logger.items as log}
          <div>{log.type.toUpperCase()} -- {log.message}</div>
          <Divider colorStrength={ColorStrength.Strong} />
        {/each}
      {:else}
        <div>No logs</div>
      {/if}
    </div>
  </div>
{/if}
{#if environment}
  <div class="fixed right-0 top-20 text-bgs1 z-50 w-20 px-2 bg-aps1 opacity-30">
    {environment}
  </div>
{/if}
