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
    userPreferences,
    dboVersion
  } from "$lib/client/stores/app.store";
  import { appEvents, toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";

  import DebugLayer from "./debug/DebugLayer.svelte";
  import ThemeLayer from "./themeLayer/ThemeLayer.svelte";
  import ModalLayer from "./ModalLayer.svelte";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import Shortcuts from "./Shortcuts.svelte";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";
  import { logger } from "$lib/client/stores/log.store";

  import { globalActions } from "$lib/client/stores/actionMap";
  import { localActions } from "$local/stores/localActionMap";
  import { localCacheableStores } from "$local/stores/localStoresMap";
  import {
    detectSystemOS,
    detectTouchDevice
  } from "$lib/client/utils/browser.utils";
  import { extractProduct } from "$lib/shared/utils/utils";
  import { getSettingsAsModal, getSettingsAsPages } from "../settingsActionMap";
  import MetadataLayer from "./MetadataLayer.svelte";
  import { appMenuStore } from "../leftPanel/appMenu.store";
  import { defaultAppMenu } from "$local/local";
  import { AlertType } from "$lib/client/types/notification.type";
  import { cacheableStores } from "$lib/client/stores/globalStoresMap";
  import AppLoadingView from "../paint/AppLoadingView.svelte";

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
    pingParent(true);
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
    appStore.checkForUpdates();
    account.ping();
  };
  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
  };
  const windowClickEventListener = (event: MouseEvent) => {
    appEvents.publish(GlobalEvent.WINDOW_CLICKED, event);
  };
  const messageReceivedListener = (event: any) => {
    try {
    } catch (e) {
      logger.logError(e);
    }
    // postMessageToParent(event.data);
  };
  async function appEventHandler(e: IEvent) {
    if (e.event === GlobalEvent.USER_LOGIN) {
      if (e.value) dataManager.refreshApp();
    }
  }
  /**
   * Sets up the app for the first time when the app is loaded.
   *
   * Note: The order of operations is important as later operations rely on earlier ones.
   */
  function bootup() {
    setLaunchContext();
    dataManager.loadStores([...cacheableStores, ...localCacheableStores]);
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
   * Initializes the app with necessary data.
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
      await dataManager.refreshApp();
      refreshTimeZone();
      appMenuStore.setDefaults(defaultAppMenu, true);
      account.setAnalyticsUserIdentity();
    } else {
      await account.logGuest();
    }
    if (isLiteMode) return;
    if (
      !excludedPathsForRedirectionCheck.includes(
        $appStore.currentPath.split("/")[1]
      )
    ) {
      const isProceed = await account.performLoginStatusCheck();
      if (isProceed) {
        let result = await appStore.checkForUpdates();
        if (!result) await dboVersion.runDboUpdate();
        else await account.ping();
      }
    }

    async function refreshAppStaticData() {
      //todo - check if the saved timezone is different from current user timezone
      try {
        const appData = await new Persistence().fetchAppData();
        if (!appData) {
          appStore.gotoErrorPage("App data not found");
        }
        appStore.loadAppData(appData);
      } catch (e) {
        logger.logError(e);
        appStore.gotoErrorPage(e);
      }
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
      localStorage.setItem("product", appDetails?.product ?? "tidigit");
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
    const envCachedOnMachine = localStorage.getItem("env");
    if ($appStore.env !== envCachedOnMachine) {
      localStorage.setItem("env", $appStore.env);
      console.log("environment changed");
      account.signOut();
    }
  }
  function handleCustomNavigation(event: any) {
    if (event.detail) goto(event.detail);
  }
  function handleCustomAlert(event: any) {
    if (event.detail) console.log("custom alert:", event.detail);
    if (event.detail?.error === "networkerror") {
      toasts.trigger({
        title: "Network Error",
        message: event.detail.message ?? "Something went wrong.",
        type: AlertType.ERROR,
        id: "networkerror"
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
  <MetadataLayer />
  <ModalLayer />
  <Shortcuts />
  <CacheLayer />
{/if}
<Intercom />
<svelte:window
  on:resize={windowResizeListener}
  on:click={windowClickEventListener}
  on:message={messageReceivedListener}
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
<svelte:head>
  <script src="localforage.js"></script>
</svelte:head>
