<script lang="ts">
  import { onMount, tick, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Embed } from "$lib/client/types/context.type";

  import type { IEvent } from "$lib/client/types/event.type";
  import { pingParent, postToParent } from "$lib/client/utils/embed.utils";
  import { detectTimeZone } from "$lib/client/utils/time.utils";

  import { Persistence } from "$lib/client/persistence/persistence";
  import { dataManager } from "$lib/client/persistence/dataManager";

  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import {
    appLoadingState,
    appStore,
    currentTime,
    excludedPathsForRedirectionCheck,
    userPreferences
  } from "$lib/client/stores/app.store";
  import { appEvents, toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";

  import DebugLayer from "./debug/DebugLayer.svelte";
  import ThemeLayer from "./themeLayer/ThemeLayer.svelte";
  import ModalLayer from "./ModalLayer.svelte";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import ShortcutRunner from "../../components/shortcuts/ShortcutRunner.svelte";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";

  import { globalActions } from "$lib/client/stores/actionMap";
  import { localActions } from "$local/localActionMap";
  import { localCacheableStores } from "$local/localStoresMap";
  import {
    detectSystemOS,
    detectTouchDevice,
    isExtensionEnvironment
  } from "$lib/client/utils/browser.utils";
  import { extractProduct } from "$lib/shared/utils/utils";
  import { getSettingsAsModal, getSettingsAsPages } from "../settingsActionMap";
  import { appMenuStore } from "../../stores/appMenu/appMenu.store";
  import { defaultAppMenu } from "$local/local";
  import { AlertType } from "$lib/client/types/notification.type";
  import { cacheableStores } from "$lib/client/stores/globalStoresMap";
  import AppLoadingView from "../paint/AppLoadingView.svelte";
  import DynamicMetadataLayer from "./DynamicMetadataLayer.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { LogType } from "$lib/client/components/debug/debug.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";

  let timer: any;
  pingParent();
  bootup();
  onMount(async () => {
    view.update(window.innerWidth, window.innerHeight);
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
    if (
      !$context.isSheet &&
      $context.isEmbed &&
      $context.protocol.includes(import.meta.env?.VITE_CUSTOM_PROTOCOL)
    ) {
      await parseEmbedToken();
    }
    await initializeData($context.isSheet);
    const appEventSub = appEvents.subscribe(appEventHandler);
    $appLoadingState.isBaseLoaded = true;

    return () => {
      appEventSub();
      clearInterval(timer);
    };
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
  const visibilityChangeListener = async (event: Event) => {
    if (document?.hidden) return;
    pingParent();
    refreshTimeZone();
    if (
      excludedPathsForRedirectionCheck.includes(
        $appStore.currentPath.split("/")[1]
      )
    )
      return;
    let isValid = await account.performLoginStatusCheck();
    if (!isValid) return;
    dataManager.refreshOnAppear();
    if (isExtensionEnvironment()) return;
    performAppUpdateCheck();
    account.ping();
  };

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
      dataManager.runDboUpdate();
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
  async function appEventHandler(e: IEvent) {
    if (e.event === GlobalEvent.USER_LOGIN) {
      if (e.value) dataManager.refreshClientCache();
    }
  }
  /**
   * Sets up the app for the first time when the app is loaded.
   *
   * Note: The order of operations is important as later operations rely on earlier ones.
   */
  function bootup() {
    setLaunchContext();
    dataManager.initialize([...cacheableStores, ...localCacheableStores]);
    addWindowEventListeners();
    runCurrentTime();
    appStore.setCurrentPath(window.location.pathname);
    initializeServiceWorker();
    checkForEnvironmentChange();
    appMenuStore.setDefaults(defaultAppMenu);

    function runCurrentTime() {
      clearInterval(timer);
      timer = setInterval(() => {
        tick();
        $currentTime = new Date();
      }, 1000);
    }
    function initializeServiceWorker() {
      if (!$context.isEmbed) {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.register("/worker.js");
        }
      }
    }
  }
  async function parseEmbedToken() {
    const token = $page.url?.searchParams?.get("token");
    if (token) {
      await account.embedOAuthSignin(token);
    }
  }
  /**
   * Initializes the app with necessary data and runs dbo update. For this, the app should have already mounted and all stores should be available.
   *
   * Note: The order of operations is important as later operations rely on earlier ones.
   * @param isLiteMode
   */
  async function initializeData(isLiteMode: boolean = false) {
    if (!isLiteMode) {
      await refreshAppStaticData();
    }
    initActions(isLiteMode);
    if ($account.isLoggedIn && !isLiteMode) {
      await dataManager.refreshClientCache();
      const isDev = import.meta.env.DEV;
      if (!isDev) await dataManager.runDboUpdate();
      refreshTimeZone();
      appMenuStore.setDefaults(defaultAppMenu, true);
      account.setAnalyticsUserIdentity();
      await account.ping();
    } else {
      await account.logGuest();
    }
    if (isLiteMode) return;
    if (
      !excludedPathsForRedirectionCheck.includes(
        $appStore.currentPath.split("/")[1]
      )
    ) {
      await account.performLoginStatusCheck();
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

  /**
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

  /**
   * Sets the launch context of the app. This includes the product, debug mode, embed mode, touch device, protocol, and OS.
   */
  function setLaunchContext() {
    try {
      const appDetails = extractProduct(
        import.meta.env?.VITE_HOST ??
          process.env.PLASMO_PUBLIC_HOST ??
          window.location.host
      );
      if (appDetails) appStore.initializeProductInformation(appDetails);
      clientStorage.set(
        ClientStorageKey.PRODUCT,
        appDetails?.product ?? "tidigit"
      );
      let isDebugMode =
        $page.url?.searchParams?.get("debug") ||
        import.meta.env?.VITE_DEBUG_MODE === "true";
      if (isDebugMode) {
        $appStore.isDebugMode = true;
      }
      const isDebugEmbedMode = import.meta.env?.VITE_IS_DEBUG_EMBED === "true";
      let browserAgent = navigator?.userAgent;
      if (isDebugEmbedMode || browserAgent.includes("embed")) {
        $context.isEmbed = true;
      }
      const isDebugHandheldMode =
        import.meta.env?.VITE_IS_DEBUG_HANDSET === "true";
      if (browserAgent.includes("handset") || isDebugHandheldMode) {
        $context.embed = Embed.HANDSET;
      } else if (browserAgent.includes("tablet")) {
        $context.embed = Embed.TABLET;
      } else {
        $context.embed = Embed.DESKTOP;
      }
      let isSheet = $page.url?.searchParams?.get("isSheet");
      let sheetPath = $page.url?.searchParams?.get("spath");
      if (isSheet) {
        $context.isSheet = true;
        if (sheetPath) $appStore.sheetPath = sheetPath;
      }
      $context.os = detectSystemOS();
      $context.isTouchDevice = detectTouchDevice();
      $context.protocol = window.location.protocol;
    } catch (e) {
      postToParent({ type: "ERROR", message: e });
    }
  }
  /**
   * Checks if the environment has changed and signs out the user if the environment has changed to avoid issues of using the cached token and 401 errors.
   */
  function checkForEnvironmentChange() {
    const envCachedOnMachine = clientStorage.get(ClientStorageKey.ENV);
    console.log("checkForEnvironmentChange", $appStore.env, envCachedOnMachine);
    if (envCachedOnMachine === null) {
      clientStorage.set(ClientStorageKey.ENV, $appStore.env);
      return;
    }
    if (envCachedOnMachine && $appStore.env !== envCachedOnMachine) {
      clientStorage.set(ClientStorageKey.ENV, $appStore.env);
      logger.log(
        {
          at: "checkForEnvironmentChange",
          message: "Environment changed. Signing out user.",
          envCachedOnMachine,
          env: $appStore.env
        },
        LogType.INFO
      );
      account.signOut();
    }
  }
  function handleCustomNavigation(event: any) {
    logger.log({ at: "handleCustomNavigation", event });
    if (event.detail?.isReload) window.location.reload();
    else if (event.detail.path) goto(event.detail.path);
  }
  function handleCustomAlert(event: any) {
    if (event.detail) console.log("custom alert:", event.detail);
    if (event.detail?.error === "networkerror") {
      toasts.trigger({
        title: "Network Error",
        message: event.detail.message ?? "Something went wrong.",
        type: AlertType.ERROR,
        id: "networkerror",
        isNonDismissable: true
      });
    }
  }
  function addWindowEventListeners() {
    window.addEventListener(
      GlobalEvent.CUSTOM_NAVIGATION,
      handleCustomNavigation
    );
    window.addEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
    window.onpopstate = () => {
      appStore.setCurrentPath(document.location.pathname);
    };
  }
  function removeWindowEventListeners() {
    window.removeEventListener(
      GlobalEvent.CUSTOM_NAVIGATION,
      handleCustomNavigation
    );
    window.removeEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
    window.onpopstate = null;
  }
  onDestroy(() => {
    removeWindowEventListeners();
  });
</script>

{#if $appStore?.appData?.isAnalyticsEnabled}
  <AnalyticsLayer />
{/if}
<div class="flex h-screen w-screen">
  <ThemeLayer>
    {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded}
      <AppLoadingView />
    {/if}
    <slot />
  </ThemeLayer>
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
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
