<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { detectTimeZone } from "$lib/client/utils/time.utils";
  import { Persistence } from "$lib/client/persistence/persistence";
  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import DebugLayer from "./debug/DebugLayer.svelte";
  import ModalLayer from "./ModalLayer.svelte";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import ShortcutRunner from "../../components/shortcuts/ShortcutRunner.svelte";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";
  import { globalActions } from "$lib/client/stores/actionMap";
  import { localActions } from "$local/localActionMap";
  import { localCacheableStores } from "$local/localStoresMap";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  import { getSettingsAsModal, getSettingsAsPages } from "../settingsActionMap";
  import { appMenuStore } from "../../stores/appMenu/appMenu.store";
  import { defaultAppMenu } from "$local/local";
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
  import {
    ClientStorageKey,
    PersistenceProvider
  } from "$lib/client/persistence/persistence.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import PageError from "$lib/client/components/error/PageError.svelte";
  import { SurrealPersistence } from "$lib/client/persistence/surreal/surreal.local";

  const loadingMessages = {
    cloneUp:
      "We are syncing your local data with the cloud. This might take a while.",
    cloneOrSyncDown:
      "We are syncing your data from cloud. This might take a while."
  };

  let loadingMessage: string = "";
  let isWindowFocused = true;
  let error: string | null = null;

  onMount(async () => {
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
    addWindowEventListeners();
    await initializeUser();
    $appLoadingState.isBaseLoaded = true;
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
  $: console.log("isWindowFocused", isWindowFocused);
  async function onAppear() {
    logger.debug({
      at: "onAppear",
      isWindowFocused,
      documentHidden: document?.hidden
    });
    refreshTimeZone();
    const isCloudUser = $account.dataMode === UserDataMode.CLOUD;
    if (isCloudUser) {
      toasts.sync();
      await flux.syncDown();
      account.ping();
    }
    if (isExtensionEnvironment()) return;
    performAppUpdateCheck();
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
  async function initializeUser() {
    try {
      const isLiteMode = $context.isSheet;
      logger.debug({
        at: "UserBaseLayer.initializeData",
        isLiteMode,
        account: $account
      });
      if (!isLiteMode) {
        await refreshAppStaticData();
      }
      initActions(isLiteMode);
      const dapId = await clientStorage.get(ClientStorageKey.DAP_ID);

      if ($account.dataMode === UserDataMode.LOCAL) {
        // loadingMessage = "Initializing...";
        await account.logGuest(dapId!);
        const initState = await initializeFlux(dapId!, true);
        logger.debug({
          at: "UserBaseLayer.initializeData - local",
          initState
        });
        if (initState === 0) await flux.kvSeed();
      } else if ($account.dataMode === UserDataMode.CLOUD) {
        if (!$account.userId) {
          error = "User id not found. Please try again later.";
          return;
        }
        let initState = await initializeFlux($account.userId);
        await flux.seed();
        logger.debug({
          at: "UserBaseLayer.initializeData - cloud",
          initState
        });
        if ($account.sessionType === UserSessionType.NEW) {
          if (initState === 2) {
            loadingMessage = loadingMessages.cloneUp;
            await flux.cloneUp();
          } else {
            await flux.kvSeed();
          }
        } else if ($account.sessionType === UserSessionType.RETURNING) {
          loadingMessage = loadingMessages.cloneOrSyncDown;
          if (initState === 1) {
            await flux.syncDown();
            await flux.loadKvStores();
          } else if (initState === 0) {
            await flux.cloneDown();
          }
        }
      }
      appMenuStore.setDefaults(defaultAppMenu);
      if ($account.dataMode === UserDataMode.CLOUD && !isLiteMode) {
        // await initializeFlux($account.userId ?? $account.userInfo?.id ?? "");

        // await dataManager.refreshClientCache();
        // const isDev = import.meta.env.DEV;
        // if (!isDev) await dataManager.runDboUpdate();
        // await account.seed();
        refreshTimeZone();
        appMenuStore.setDefaults(defaultAppMenu, true);
        account.setAnalyticsUserIdentity();
        await account.ping();
      }
    } catch (e) {
      logger.error(e);
    }

    function initActions(isSheet?: boolean) {
      const modifiedGlobalActions = globalActions.filter(
        (x) => !localActions.some((y) => y.action === x.action)
      );
      let actions = [...modifiedGlobalActions, ...localActions];
      if (isSheet) appStore.initActionsForSheet(actions);
      else
        appStore.initActions(
          actions,
          getSettingsAsModal(),
          getSettingsAsPages()
        );
    }
  }

  async function initializeFlux(userId: string, isLocalMode: boolean = false) {
    return initFlux(
      [...cacheableStores, ...localCacheableStores],
      PersistenceProvider.SURREAL_SURREAL,
      new SurrealPersistence(),
      userId,
      { isLocalMode }
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
      appStore.gotoErrorPage(e);
    }
  }

  function handlePersistAppearance(event: any) {
    userPreferences.setAppearance(event.detail);
  }

  function addWindowEventListeners() {
    window.addEventListener(
      GlobalEvent.PERSIST_APPEARANCE_USER,
      handlePersistAppearance
    );
  }
  function removeWindowEventListeners() {
    window.removeEventListener(
      GlobalEvent.PERSIST_APPEARANCE_USER,
      handlePersistAppearance
    );
  }
  onDestroy(() => {
    removeWindowEventListeners();
  });
</script>

{#if $appStore?.appData?.isAnalyticsEnabled}
  <AnalyticsLayer />
{/if}
<div class="flex h-screen w-screen">
  {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded}
    <AppLoadingView message={loadingMessage} />
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
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
