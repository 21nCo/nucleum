<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import DebugInfoItem from "./DebugInfoItem.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import appearance from "$lib/client/stores/appearance.store";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { ColorStrength } from "$lib/client/types/appearance.type";
  import { Size } from "$lib/client/types/size.enum";
  import context from "$lib/client/stores/context.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import account from "$lib/client/stores/account.store";
  import { Action } from "$lib/client/types/action.enum";
  import { FallbackTracker } from "$lib/client/utils/fallbackTracker.utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  export let isShowAsPage: boolean = false;
  let isShowDebugOverlay: boolean = false;
  let environment: string = $appStore.env;
  let isShowLogs: boolean = false;
  let isDboUpdateInProgress: boolean = false;
  let storageQuota: number | undefined;
  let storageUsage: number | undefined;
  let fallbackStatuses: any = {};
  let isShowFallbacks: boolean = false;
  checkStorage();
  loadFallbackStatuses();
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
  function clearCache() {
    account.signOut();
  }
  async function loadFallbackStatuses() {
    try {
      fallbackStatuses = await FallbackTracker.getAll();
    } catch (error) {
      console.error("Failed to load fallback statuses:", error);
      fallbackStatuses = {};
    }
  }
  async function resetAllFallbacks() {
    try {
      await FallbackTracker.resetAll();
      await loadFallbackStatuses();
    } catch (error) {
      console.error("Failed to reset fallbacks:", error);
    }
  }
</script>

{#if isShowDebugOverlay || isShowAsPage}
  <div
    class={cn("flex flex-col gap-2 p-2 dp:p-8 text-fgs1", {
      "absolute z-50 bottom-20 right-0 bg-bgs3 rounded-lg": !isShowAsPage,
      "w-full h-full": isShowAsPage
    })}
  >
    {#if !isShowAsPage}
      <button
        class="absolute top-0 right-0 flex flex-col p-1 bg-bgs3 text-fgs1 rounded-lg z-50"
        on:click={() => (isShowDebugOverlay = false)}
      >
        <Icon icon="minus-circled" />
      </button>
    {/if}
    <DebugInfoItem
      label="Context"
      value={` isEmbed: ${$context.isEmbed}, isSheet: ${$context.isSheet}, embed: ${$context.embed}, os: ${$context.os}`}
    />
    <DebugInfoItem
      label="Host"
      value={"host: " +
        window.location.host +
        " protocol: " +
        window.location.protocol}
    />
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
    <DebugInfoItem label="Display" value={$view.display} />
    <DebugInfoItem label="Skin" value={$userPreferences?.appearance?.skin} />
    <DebugInfoItem
      label="Theme & Color scheme"
      value={$appearance.theme +
        "  " +
        $appearance.colorScheme.tailwindSelector}
    />
    <DebugInfoItem
      label="Typeface"
      value={$userPreferences?.appearance?.typeface}
    />
    <DebugInfoItem label="Portrait mode" value={$view.isPortrait} />
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
    <Divider colorStrength={ColorStrength.Strong} />
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold">Fallback Status</span>
        <Button
          size={Size.xs}
          icon="refresh"
          on:click={loadFallbackStatuses}
          label="Refresh"
        />
        <Button
          size={Size.xs}
          type={ButtonVariant.DANGER}
          style={ButtonStyle.OUTLINED}
          icon="trash"
          on:click={resetAllFallbacks}
          label="Reset All"
        />
      </div>
      {#if Object.keys(fallbackStatuses).length > 0}
        <div class="text-xs max-h-32 overflow-y-auto">
          {#each Object.entries(fallbackStatuses) as [name, status]}
            <div
              class="flex justify-between items-center py-1 border-b border-brs1"
            >
              <span class="truncate">{name}</span>
              <span class="text-green-500 text-xs">✓</span>
            </div>
          {/each}
        </div>
      {:else}
        <span class="text-xs text-fgs2">No fallbacks run yet</span>
      {/if}
    </div>
    <div class="flex flex-wrap gap-2 w-full justify-center items-center">
      <Button
        type={ButtonVariant.PRIMARY}
        on:click={() => {
          appStore.runAction("surreal-local");
        }}
        icon="ph:terminal"
        label="Surreal console"
      />
      <Button
        type={ButtonVariant.PRIMARY}
        on:click={() => {
          appStore.runAction("signaldb-console");
        }}
        icon="ph:terminal"
        label="SignalDB console"
      />
      <Button
        icon="play"
        on:click={() => {
          appStore.runAction(Action.MANUAL_RUN_DBO);
        }}
        label="Run manual dbo update"
      />
      <Button
        icon="trash"
        type={ButtonVariant.DANGER}
        style={ButtonStyle.OUTLINED}
        on:click={clearCache}
        label="Clear cache and logout"
      />
      {#if !isShowAsPage}
        <Button
          on:click={() => {
            isShowDebugOverlay = false;
          }}
          label="Close"
        />
      {/if}
    </div>
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
    <span> Replaced with telemetry. </span>
    <!-- <div class="flex flex-col items-start gap-2 overflow-y-auto">
      {#if $logger.items && $logger.items.length > 0}
        {#each $logger.items as log}
          <div class="text-left">
            {log.type.toString().toUpperCase()} -- {log.message}
          </div>
          <Divider colorStrength={ColorStrength.Strong} />
        {/each}
      {:else}
        <div>No logs</div>
      {/if}
    </div> -->
  </div>
{/if}
{#if environment}
  <div class="fixed right-0 top-20 text-bgs1 z-50 w-20 px-2 bg-aps1 opacity-30">
    {environment}
  </div>
{/if}
