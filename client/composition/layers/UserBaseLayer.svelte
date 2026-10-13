<svelte:options runes={true} />

<script lang="ts">
  import { refreshTimeZone } from "@nucleum/shared-state/preferences/timezone";
  import { performAppUpdateCheck } from "@nucleum/surfaces/settings/about/app-update";
  import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";
  import { pullForegroundDatafn } from "@nucleum/datafn/visibility-sync";
  import { createLegacyDataRecovery } from "@nucleum/surfaces/settings/data-recovery/legacy-data-recovery.svelte";

  import { refreshAppStaticData } from "@nucleum/shared-state/app-context/app-data";

  import { syncAccountPaidPlanFromExternalProvider } from "@nucleum/surfaces/subscription/plan-sync";
  import { handleNativePurchase } from "@nucleum/surfaces/subscription/native-purchases";
  import { parseNativeMessage } from "@nucleum/client/runtime/embed/native-message";
  import { handleNativeFileMessage } from "@nucleum/shared-state/files/native-file-messages";
  import { initializeUserConfig } from "@nucleum/composition/layers/telemetry/user-identity";

  import { installApplicationHosts } from "../configure-hosts";
  import type { Snippet } from "svelte";
  import { onDestroy, onMount } from "svelte";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";

  import account from "@nucleum/client/runtime/account/account.store";
  import {
    appLoadingState,
    appStore
  } from "@nucleum/shared-state/app-context/app.store";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";

  import context from "@nucleum/client/runtime/context.store";
  import Diagnostics from "@nucleum/surfaces/help/diagnostics/Diagnostics.svelte";
  import ModalLayer from "@nucleum/shell/overlays/ModalLayer.svelte";
  import AnalyticsLayer from "@nucleum/composition/layers/telemetry/AnalyticsLayer.svelte";
  import ShortcutRunner from "@nucleum/shell/shortcuts/ShortcutRunner.svelte";
  import Intercom from "@nucleum/surfaces/help/support/Intercom.svelte";
  import { installVisibilitySync } from "@nucleum/datafn/visibility-sync";
  import { safeRequestIdleCallback } from "@21n/shared-utils/idle-callback";

  import AppLoadingView from "../AppLoadingView.svelte";
  import DynamicMetadataLayer from "@nucleum/shell/layers/DynamicMetadataLayer.svelte";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
  import { getDapId } from "@nucleum/persistence/device-id";
  import PageError from "@nucleum/surfaces/help/errors/PageError.svelte";

  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import { Action } from "@nucleum/client/config/action.enum";

  import { embedBridge } from "@nucleum/client/runtime/embed/embed.store";
  import { postMessageToParent } from "@nucleum/client/runtime/embed/embed.utils";
  import { EmbedMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";

  import UserLayout from "./UserLayout.svelte";
  import LegacyLocalDataRecoveryGate from "@nucleum/surfaces/settings/data-recovery/LegacyLocalDataRecoveryGate.svelte";

  import { UIStateScope } from "@nucleum/shared-state/preferences/ui-state/uiState.type";

  import { recentsStore } from "@nucleum/shared-state/resources/recent.store";
  import { resolveProductResources } from "@nucleum/datafn/resource.utils";
  import {
    nucleumDatafnStatus,
    initializeNucleumDatafn,
    reconcileDatafnNow,
    refreshNucleumDatafnStatus
  } from "@nucleum/datafn/datafn.store";

  onDestroy(installApplicationHosts());

  let {
    children,
    topnav: topnavContent,
    onReady
  }: {
    children?: Snippet;
    topnav?: Snippet;
    onReady?: () => void | Promise<void>;
  } = $props();
  const loadingMessages = {
    cloneUp: {
      message: "Syncing your local data with the cloud...",
      subMessage: "This might take a while."
    },
    pull: {
      message: "Syncing your data from cloud..."
    },
    cloneDown: {
      message: "First login detected. Syncing your data..."
    }
  };
  let loadingMessage = $state<{
    message: string;
    subMessage?: string;
    duration?: number;
    percentage?: number;
  }>({
    message: ""
  });
  let isAppLoading = $state(false);
  let error = $state<string | null>(null);
  let dev_isDisableSyncOnAppear = false;
  let subs: any[] = [];
  let isStartupCompleted = false;
  const recovery = createLegacyDataRecovery({
    initializeDatabase,
    completeApplicationStartup,
    startApplication,
    onLoading: (message) => {
      loadingMessage = message;
    }
  });
  const isDebug = import.meta.env?.DEV;

  $effect(() => {
    if (
      $nucleumDatafnStatus.nucleumMode === "sync" &&
      recovery.isCloudUploadPending
    ) {
      void recovery.uploadPendingCloudData();
    }
  });

  $effect(() => {
    if ($appLoadingState.isBaseLoaded) return installVisibilitySync();
  });

  onMount(async () => {
    postMessageToParent(EmbedMessage.MOUNT);
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
    addWindowEventListeners();
    refreshUIStateDerived();
    const uiStateSub = uiState.subscribe(() => {
      refreshUIStateDerived();
    });
    subs.push(uiStateSub);

    const isLegacyRecoveryRequired = await recovery.prepare();
    if (!isLegacyRecoveryRequired) {
      await startApplication();
    }
  });

  function refreshUIStateDerived() {
    const interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      scope: UIStateScope.PRODUCT
    });
    $appStore.interactionMode = interactionMode;
  }

  async function startApplication(options?: {
    isOfflinabilityEnabled?: boolean;
  }) {
    if (isStartupCompleted) return;
    const runtime = await initializeDatabase(options);
    if (runtime) {
      try {
        await completeApplicationStartup();
      } catch (startupError) {
        error = "Unable to initialize local data. Please try again later.";
        logger.error({ at: "startApplication", error: startupError });
      }
    }
  }

  async function completeApplicationStartup() {
    if (isStartupCompleted) return;
    await Promise.all([
      initializeUserConfig(),
      recentsStore.refresh(
        resolveProductResources($appStore.product, "search") ?? []
      )
    ]);
    $appLoadingState.isBaseLoaded = true;
    isStartupCompleted = true;
    if (typeof onReady === "function") {
      await onReady();
    }
    if ($context.isEmbed && $context.isSheet) {
      $appLoadingState.isLocalLoaded = true;
    }
    scheduleIdleMaintenance();
  }

  function scheduleIdleMaintenance() {
    safeRequestIdleCallback(async () => {
      if ($nucleumDatafnStatus.nucleumMode === "sync" && !isDebug) {
        await reconcileDatafnNow();
      }
      await refreshNucleumDatafnStatus();
      await syncAccountPaidPlanFromExternalProvider();
    });
  }

  async function onAppear() {
    try {
      await recovery.uploadPendingCloudData();
      await refreshTimeZone();
      const isCloudUser = $nucleumDatafnStatus.nucleumMode === "sync";
      if (isCloudUser && !dev_isDisableSyncOnAppear) {
        await pullForegroundDatafn();
      }
      if (isExtensionEnvironment() || isDebug) return;
      performAppUpdateCheck();
      await refreshNucleumDatafnStatus();
    } catch (e) {
      logger.error({ at: "onAppear", error: e });
    }
  }

  async function initializeDatabase(options?: {
    isOfflinabilityEnabled?: boolean;
  }) {
    try {
      const isLiteMode = $context.isSheet;
      logger.log({
        at: "UserBaseLayer.initializeData",
        isLiteMode,
        dataMode: $account.dataMode
      });
      if (!isLiteMode && !isDebug && !$context.isInOfflineMode) {
        await refreshAppStaticData();
      }
      const dapId = await getDapId();

      const hasUserSpace = Boolean($account.userId || $account.userInfo?.id);
      if ($account.dataMode !== UserDataMode.LOCAL && !hasUserSpace) {
        error = "User id not found. Please try again later.";
        return;
      }
      loadingMessage = loadingMessages.cloneDown;
      const runtime = await initializeNucleumDatafn({
        product: $appStore.product,
        account: $account,
        env: $appStore.env,
        appVersion: $appStore.version + "." + $appStore.build,
        dapId: dapId!,
        isOffline: $context.isInOfflineMode,
        isOfflinabilityEnabled: options?.isOfflinabilityEnabled
      });
      logger.log({
        at: "UserBaseLayer.initializeData - datafn",
        mode: runtime.mode,
        namespace: runtime.namespace,
        storageDbName: runtime.storageDbName,
        os: $context.os,
        isEmbed: $context.isEmbed,
        embed: $context.embed,
        userAgent: navigator.userAgent
      });
      return runtime;
    } catch (e) {
      error = "Unable to initialize local data. Please try again later.";
      logger.error({ at: "initializeDatabase", error: e });
    }
  }

  function handlePersistAppearance(event: any) {
    userPreferences.setAppearance(event.detail);
  }

  function handleAppLoadingStatus(event: any) {
    logger.log({ at: "handleAppLoadingStatus", event });
    const detail = event.detail;
    if (detail.message || detail.subMessage) {
      isAppLoading = true;
    }
    if (detail.isFinished) {
      setTimeout(() => {
        isAppLoading = false;
      }, 500);
    }
    if (detail.message !== undefined) {
      loadingMessage.message = detail.message;
    }
    if (detail.subMessage !== undefined) {
      loadingMessage.subMessage = detail.subMessage;
    }
    if (detail.duration !== undefined) {
      loadingMessage.duration = detail.duration;
    }
    if (detail.percentage !== undefined) {
      loadingMessage.percentage = detail.percentage;
    }
  }

  function handleAddToRecents(event: any) {
    logger.log({ at: "handleAddToRecents", event });
    const { record, type, timestamp } = event.detail;
    recentsStore.add(record, { type, timestamp });
  }

  async function handleMessageFromParent(event: MessageEvent) {
    try {
      const parsed = parseNativeMessage(event);
      if (!parsed) return;
      if (
        await handleNativePurchase(parsed, {
          verifying: () => {
            loadingMessage.message = "Verifying payment...";
          },
          finished: () => {
            isAppLoading = false;
          }
        })
      )
        return;
      if (handleNativeFileMessage(parsed)) return;
      if (parsed.type && parsed.id && parsed.data)
        embedBridge.setData(parsed.id, parsed.type, parsed.data);
    } catch (error) {
      logger.error({
        at: "handleMessageFromParent",
        error,
        eventType: event?.data?.type,
        origin: event?.origin
      });
    }
  }

  function addWindowEventListeners() {
    window.addEventListener(
      GlobalEvent.PERSIST_APPEARANCE_USER,
      handlePersistAppearance
    );
    window.addEventListener(
      GlobalEvent.APP_LOADING_STATUS,
      handleAppLoadingStatus
    );
    window.addEventListener(GlobalEvent.ADD_TO_RECENTS, handleAddToRecents);
    window.addEventListener("message", handleMessageFromParent);
    window.addEventListener("focus", onAppear);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("unload", handleBeforeUnload);
  }
  function removeWindowEventListeners() {
    window.removeEventListener(
      GlobalEvent.PERSIST_APPEARANCE_USER,
      handlePersistAppearance
    );
    window.removeEventListener(
      GlobalEvent.APP_LOADING_STATUS,
      handleAppLoadingStatus
    );
    window.removeEventListener(GlobalEvent.ADD_TO_RECENTS, handleAddToRecents);
    window.removeEventListener("message", handleMessageFromParent);
    window.removeEventListener("focus", onAppear);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    window.removeEventListener("unload", handleBeforeUnload);
  }
  function handleBeforeUnload(event: any) {
    if (
      !isDebug &&
      ($context.isInOfflineMode || $account.dataMode === UserDataMode.LOCAL)
    ) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
  onDestroy(() => {
    removeWindowEventListeners();
    subs.forEach((sub) => sub());
  });
</script>

{#if $appStore?.appData?.isAnalyticsEnabled && $account?.dataMode === UserDataMode.CLOUD && !$context.isInOfflineMode}
  <AnalyticsLayer />
{/if}
<div class="flex w-screen h-screen">
  {#if error}
    <PageError />
  {:else if recovery.summary && recovery.mode}
    <LegacyLocalDataRecoveryGate
      summary={recovery.summary}
      mode={recovery.mode}
      errorMessage={recovery.error}
      onImport={recovery.importData}
      onDownloadAndContinue={recovery.downloadAndContinue}
    />
  {:else if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded || isAppLoading}
    <AppLoadingView
      message={loadingMessage.message}
      subMessage={loadingMessage.subMessage}
      duration={loadingMessage.duration}
      percentage={loadingMessage.percentage}
    />
  {:else}
    <UserLayout topnav={topnavContent}>
      {@render children?.()}
    </UserLayout>
  {/if}
</div>
{#if $appStore.isDebugMode}
  <Diagnostics />
{/if}
{#if $appLoadingState.isBaseLoaded}
  <DynamicMetadataLayer
    metadata={{
      title: $appStore?.appData?.name ?? $appStore?.product,
      ...$appStore?.appData?.meta
    }}
  />
  <ModalLayer />
  <ShortcutRunner />
{/if}
<Intercom />
