<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { detectTimeZone } from "$lib/client/utils/time.utils";
  import { Persistence } from "$lib/client/persistence/persistence";
  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import {
    confirmationNotification,
    toasts
  } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import DebugLayer from "./debug/DebugLayer.svelte";
  import ModalLayer from "./ModalLayer.svelte";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import ShortcutRunner from "../../components/shortcuts/ShortcutRunner.svelte";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";
  import {
    localCacheableStores,
    remoteOnlyStores
  } from "$local/localStoresMap";
  import { resourcesForRecents } from "$local/local";
  import {
    dispatchCustomEvent,
    isExtensionEnvironment
  } from "$lib/client/utils/browser.utils";
  import { appMenuStore } from "../../stores/appMenu/appMenu.store";
  import { AlertType } from "$lib/client/types/notification.type";
  import { cacheableStores } from "$lib/client/stores/globalStoresMap";
  import AppLoadingView from "../paint/AppLoadingView.svelte";
  import DynamicMetadataLayer from "./DynamicMetadataLayer.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { LogType } from "$lib/client/components/debug/debug.type";
  import { flux, initFlux } from "$lib/client/components/flux/flux";
  import {
    UserDataMode,
    UserSessionType
  } from "$lib/client/types/account.type";
  import { PersistenceProvider } from "$lib/client/persistence/persistence.type";
  import { getDapId } from "$lib/client/persistence/persistence.utils";
  import PageError from "$lib/client/components/error/PageError.svelte";
  import { SurrealPersistence } from "$lib/client/persistence/surreal/surreal.local";
  import { Embed } from "$lib/client/types/context.type";
  import posthog from "posthog-js";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import { initializeTaco } from "$lib/client/products/memotron/taco/taco.store";
  import { recentsStore } from "$lib/client/components/record/recent.store";

  const loadingMessages = {
    cloneUp: {
      message: "Syncing your local data with the cloud...",
      subMessage: "This might take a while."
    },
    syncDown: {
      message: "Syncing your data from cloud..."
    },
    cloneDown: {
      message: "Copying data from cloud..."
    }
  };

  let loadingMessage: {
    message: string;
    subMessage?: string;
  } = {
    message: ""
  };
  let isAppLoading = false;
  let error: string | null = null;
  let dev_isDisableSyncOnAppear = false;

  onMount(async () => {
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
    addWindowEventListeners();
    console.time("init");
    const initState = await initializeDatabase();
    refreshAppMenuDefaults(false);
    $appLoadingState.isBaseLoaded = true;
    let userDataState: any;
    if (initState !== undefined)
      userDataState = await initializeEssentialUserData(initState);
    const promises = [
      recentsStore.initialize(resourcesForRecents),
      initializeUserConfig()
    ];
    await Promise.all(promises);

    dispatch("ready");
    console.timeEnd("init");

    requestIdleCallback(async () => {
      if (userDataState?.paginateResources) {
        await flux.paginateResources(userDataState.paginateResources, 100);
        dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
      } else if (userDataState?.counts && !import.meta.env?.DEV) {
        await flux.reconcile({ counts: userDataState.counts });
        dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
      }
      await recentsStore.initialize(resourcesForRecents);
      initializeTaco();
    });
  });
  /**
   * Refreshes the timezone of the user. If the user is signing up, it will set & persist the timezone to the detected timezone. If the user is logged in, it will set the timezone to the detected timezone only if the timezone is different from the saved timezone.
   *
   * TODO - Prompt user if timezone change detected before directly setting the timezone.
   *
   * @param isSignup - If the user is signing up
   */
  function refreshTimeZone() {
    const timeZone = detectTimeZone();
    if (!timeZone || !$userPreferences) return;
    if ($userPreferences.timeZoneOffset !== timeZone.offset * 60) {
      return userPreferences.setTimeZone(timeZone.offset * 60, timeZone.label);
    }
  }

  /**
   * Disabled visibility change listener for onAppear() - using focus event instead as visibilitychange only get triggered when the tab is switched not the window.
   * @param event
   */
  const visibilityChangeListener = async (event: Event) => {
    if (document?.hidden) return;
    // await onAppear();
  };

  async function onAppear() {
    try {
      refreshTimeZone();
      const isCloudUser = $account.dataMode === UserDataMode.CLOUD;
      if (isCloudUser && !dev_isDisableSyncOnAppear) {
        await flux.syncDown({ src: "onAppear" });
        await account.ping();
      }
      if (isExtensionEnvironment() || import.meta.env?.DEV) return;
      performAppUpdateCheck();
    } catch (e) {
      logger.error(e);
    }
  }

  /**
   * Checks if the app version on client is different from the version on server. If the versions are different, it will run the dbo update and prompt user to reload the app if it is a web app.
   */
  async function performAppUpdateCheck() {
    const versionOnClient = $appStore.appData?.version;
    await refreshAppStaticData();
    const latestVersion = $appStore.appData?.version;
    if (versionOnClient !== latestVersion) {
      if (!$context.isEmbed) {
        toasts.trigger({
          id: "appUpdateAvailable",
          title: `App update available (v${latestVersion}) 🎉`,
          type: AlertType.INFO,
          actionText: "Reload",
          callback: () => {
            window.location.reload();
          }
        });
      }
    }
    logger.log(
      {
        at: "operformAppUpdateCheck",
        versionOnClient,
        appDataVersion: latestVersion
      },
      LogType.INFO
    );
  }

  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
  };

  const messageReceivedListener = (event: any) => {
    try {
    } catch (e) {
      logger.error(e);
    }
    // postMessageToParent(event.data);
  };

  /**
   * Initializes the app with necessary data and runs dbo update. For this, the app should have already mounted and all stores should be available.
   *
   * Note: The order of operations is important as later operations rely on earlier ones.
   * @param isLiteMode
   */
  async function initializeDatabase(): Promise<number | undefined> {
    try {
      const isLiteMode = $context.isSheet;
      logger.log({
        at: "UserBaseLayer.initializeData",
        isLiteMode,
        account: $account
      });
      if (!isLiteMode && !import.meta.env?.DEV) {
        await refreshAppStaticData();
      }
      const dapId = await getDapId();

      if ($account.dataMode === UserDataMode.LOCAL) {
        // loadingMessage = "Initializing...";
        await account.logGuest(dapId!);
        const initState = await initializeFlux({
          dapId: dapId!
        });
        logger.log({
          at: "UserBaseLayer.initializeData - local",
          initState
        });
        if (initState === 0) await flux.kvSeed();
        else await flux.loadInMemoryStores();
        return initState;
      }
      if (!$account.userId) {
        error = "User id not found. Please try again later.";
        return;
      }
      let initState = await initializeFlux({
        userId: $account.userId,
        dapId: dapId!
      });
      //TODO - check for placement of this and duplicate check with refreshTimeZone
      await flux.seed();
      logger.log({
        at: "UserBaseLayer.initializeData - cloud",
        initState,
        os: $context.os,
        isEmbed: $context.isEmbed,
        embed: $context.embed,
        userAgent: navigator.userAgent
      });
      return initState;
    } catch (e) {
      logger.error(e);
    }
  }

  async function initializeFlux(params: { dapId: string; userId?: string }) {
    return initFlux(
      [...cacheableStores, ...localCacheableStores],
      PersistenceProvider.SURREAL_SURREAL,
      new SurrealPersistence(),
      {
        ...params,
        appVersion: $appStore.appData?.version,
        remoteOnlyStores: [...remoteOnlyStores]
      }
    );
  }

  async function initializeEssentialUserData(initState: number): Promise<
    | {
        paginateResources?: any;
        counts?: any;
      }
    | undefined
  > {
    if ($account.dataMode === UserDataMode.LOCAL) {
      return;
    }
    if ($account.sessionType === UserSessionType.NEW) {
      if (initState === 2) {
        loadingMessage = loadingMessages.cloneUp;
        await flux.cloneUp();
      } else {
        await flux.kvSeed();
      }
    } else if ($account.sessionType === UserSessionType.RETURNING) {
      if (initState === 0) {
        loadingMessage = loadingMessages.cloneDown;
        const result = await flux.initializeEssentialDataForCloudUser();
        dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
        if (typeof result === "object" && result?.ifrCloneResult) {
          return result.ifrCloneResult;
        }
      } else {
        loadingMessage = loadingMessages.syncDown;
        return flux.initialSyncDown();
      }
    }
  }

  async function initializeUserConfig() {
    console.time("initializeUserConfig");
    const isLiteMode = $context.isSheet;
    if ($account.dataMode === UserDataMode.CLOUD && !isLiteMode) {
      refreshTimeZone();
      setAnalyticsUserIdentity();
      await account.ping();
    }
    refreshAppMenuDefaults();
    console.timeEnd("initializeUserConfig");
    function setAnalyticsUserIdentity() {
      if (!$account.userInfo) return;
      posthog.identify($account.userInfo.id, {
        region: $account.userInfo.region
      });
    }
  }

  function refreshAppMenuDefaults(isPersist?: boolean) {
    const defaultAppMenu = $appStore.appData?.appMenu ?? [];
    const defaultAppMenuMobile = $appStore.appData?.appMenuMobile ?? [];
    const appMenuDefaults = {
      all: defaultAppMenu,
      mobile: defaultAppMenuMobile
    };
    appMenuStore.setDefaults(
      appMenuDefaults,
      isPersist ?? $account.dataMode === UserDataMode.CLOUD
    );
  }

  /**
   * TODO - load static data (not from url)
   * Refreshes the app static data from the server.
   */
  async function refreshAppStaticData() {
    try {
      const appData = await new Persistence().fetchAppData();
      if (!appData) {
        throw new Error("App data not found");
      }
      appStore.loadAppData(appData);
    } catch (e) {
      logger.error(e);
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
  }
  function handleBeforeUnload(event: any) {
    if (
      !import.meta.env?.DEV &&
      ($context.isInOfflineMode || $account.dataMode === UserDataMode.LOCAL)
    ) {
      event.preventDefault();
      event.returnValue = "";
      // confirmationNotification.notify({
      //   title: "You are offline.",
      //   message:
      //     "Reloading the page may not load the app again if you are not connected to the internet",
      //   type: AlertType.WARNING,
      //   confirmAction: {
      //     label: "Reload",
      //     callback: async () => {
      //       window.location.reload();
      //     }
      //   }
      // });
    }
  }
  onDestroy(() => {
    removeWindowEventListeners();
  });
</script>

{#if $appStore?.appData?.isAnalyticsEnabled && $account?.dataMode === UserDataMode.CLOUD && !$context.isInOfflineMode}
  <AnalyticsLayer />
{/if}
<div class="flex h-screen w-screen">
  {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded || isAppLoading}
    <AppLoadingView
      message={loadingMessage.message}
      subMessage={loadingMessage.subMessage}
    />
  {:else if error}
    <PageError />
  {:else}
    <slot />
  {/if}
</div>
{#if $appStore.isDebugMode}
  <DebugLayer />
{/if}
{#if $appLoadingState.isBaseLoaded}
  <DynamicMetadataLayer />
  <ModalLayer />
  <ShortcutRunner />
  <CacheLayer />
{/if}
<Intercom />

<svelte:window
  on:resize={windowResizeListener}
  on:message={messageReceivedListener}
  on:focus={onAppear}
  on:beforeunload={handleBeforeUnload}
  on:unload={handleBeforeUnload}
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
