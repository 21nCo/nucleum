<script lang="ts">
  import { onMount, tick } from "svelte";
  import { page } from "$app/stores";

  import { EmbedContext, LaunchContext } from "$lib/client/types/appStore.type";
  import { AppEvent } from "$lib/client/types/event.enum";
  import { Embed } from "$lib/client/types/context.type";

  import type { AppEventType } from "$lib/client/types/event.type";
  import { pingParent, postToParent } from "$lib/client/utils/embed.utils";
  import { extractProduct } from "$lib/client/utils/utils";
  import { detectTimeZone } from "$lib/client/utils/time.utils";

  import { Persistance } from "$lib/client/stores/persistance";
  import { dataManager } from "$lib/client/stores/data.store";

  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import appearance from "$lib/client/stores/appearance.store";
  import {
    appLoadingState,
    appStore,
    cacheableStores,
    currentTime,
    excludedPathsForRedirectionCheck,
    userPreferences,
    dboVersion
  } from "$lib/client/stores/app.store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";

  import DebugLayer from "./debug/DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import ModalLayer from "./ModalLayer.svelte";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import Shortcuts from "./Shortcuts.svelte";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";
  import { logger } from "$lib/client/stores/log.store";

  import { globalActions } from "$lib/client/stores/actionMap";
  import { settingsAsModal, settingsAsPages } from "../settingsActionMap";
  import { localActions } from "$local/stores/localActionMap";
  import { localCacheableStores } from "$local/stores/localStoresMap";
  // import { localActions, localCacheableStores } from "$local/local";

  /**
   * Refreshes the timezone of the user. If the user is signing up, it will set & persist the timezone to the detected timezone. If the user is logged in, it will set the timezone to the detected timezone only if the timezone is different from the saved timezone.
   * @param isSignup - If the user is signing up
   */
  function refreshTimeZone(isSignup?: boolean) {
    const timeZone = detectTimeZone();
    if (isSignup) {
      if (timeZone)
        userPreferences.setTimeZone(timeZone.offset * 60, timeZone.label);
      else userPreferences.setTimeZone();
      return;
    }
    if (!timeZone) return;
    if ($userPreferences.timeZoneOffset !== timeZone.offset * 60) {
      userPreferences.setTimeZone(timeZone.offset * 60, timeZone.label);
    }
  }
  const visibilityChangeListener = async (event: Event) => {
    if (document?.hidden) return;
    pingParent(true);
    refreshTimeZone();
    if (
      excludedPathsForRedirectionCheck.includes($view.currentPath.split("/")[1])
    )
      return;
    let isValid = await account.performLoginStatusCheck();
    if (!isValid) return;
    dataManager.refreshOnAppear();
    appStore.checkForUpdates();
    account.ping();

    //Removed - Use <svelte:document on:visibilitychange={handleVisibilityChange} /> in the required component instead
    //appEvents.publish(AppEvent.WINDOW_VISIBILITY_CHANGED, event);
  };
  const windowResizeListener = (event: Event) => {
    view.update(window.innerWidth, window.innerHeight);
    appEvents.publish(AppEvent.WINDOW_RESIZED, event);
  };
  const windowClickEventListener = (event: MouseEvent) => {
    appEvents.publish(AppEvent.WINDOW_CLICKED, event);
  };
  const messageReceivedListener = (event: any) => {
    try {
    } catch (e) {
      logger.logError(e);
    }
    // postMessageToParent(event.data);
  };
  let timer: any;
  pingParent();
  bootup();
  onMount(async () => {
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
    if (!$context.isSheet) {
      await parseEmbedToken();
      await initializeData();
    }
    view.update(window.innerWidth, window.innerHeight);
    const appEventSub = appEvents.subscribe(appEventHandler);
    $appLoadingState.isBaseLoaded = true;
    const darkModeMediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
    appearance.setSystemTheme(darkModeMediaQuery.matches);
    darkModeMediaQuery.addEventListener("change", (e) => {
      appearance.setSystemTheme(e.matches);
    });

    return () => {
      appEventSub();
      clearInterval(timer);
      window?.removeEventListener("visibilitychange", visibilityChangeListener);
      window?.removeEventListener("resize", windowResizeListener);
      window?.removeEventListener("click", windowClickEventListener);
      window?.removeEventListener("message", messageReceivedListener);
    };
  });
  async function appEventHandler(e: AppEventType) {
    if (e.event === AppEvent.USER_LOGIN) {
      if (e.value)
        dataManager.initialize([...cacheableStores, ...localCacheableStores]);
    } else if (e.event === AppEvent.USER_SIGNUP) {
      //TODO - load seed data - delegation via DataManager - for all kvo stores load and save seed data on cloud on signup
      userPreferences.loadSeedData();
      refreshTimeZone(true);
      dataManager.initialize([...cacheableStores, ...localCacheableStores]);
    }
  }
  function bootup() {
    refreshTimeZone();
    setLaunchContext();
    addWindowEventListeners();
    runCurrentTime();
    appStore.setCurrentPath(window.location.pathname);
  }
  async function parseEmbedToken() {
    const token = $page.url?.searchParams?.get("token");
    const isSignup = $page.url?.searchParams?.get("signup");
    if (token) {
      await account.embedOAuthSignin(token, isSignup === "true" ?? false);
    }
  }
  async function initializeData() {
    //todo - check if the saved timezone is different from current user timezone
    const appData = await new Persistance().fetchAppData();
    appStore.loadAppData(appData);
    if ($account.isLoggedIn)
      await dataManager.initialize([
        ...cacheableStores,
        ...localCacheableStores
      ]);
    initActions();
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
  }
  function initActions() {
    const modifiedGlobalActions = globalActions.filter(
      (x) => !localActions.some((y) => y.action === x.action)
    );
    let actions = [...modifiedGlobalActions, ...localActions];
    appStore.initActions(actions, settingsAsModal, settingsAsPages);
  }
  function runCurrentTime() {
    clearInterval(timer);
    timer = setInterval(() => {
      tick();
      $currentTime = new Date();
    }, 1000);
  }
  function setLaunchContext() {
    try {
      const appDetails = extractProduct();
      if (appDetails) appStore.initializeProductInformation(appDetails);
      let subdomain = window?.location.host.split(".")[0];
      let isDebugMode =
        $page.url?.searchParams?.get("debug") ||
        import.meta.env.VITE_DEBUG_MODE === "true";
      if (isDebugMode) {
        $appStore.isDebugMode = true;
      }
      const isDebugEmbedMode = import.meta.env.VITE_IS_DEBUG_EMBED === "true";
      let browserAgent = navigator?.userAgent;
      if (
        subdomain?.includes("embed") ||
        isDebugEmbedMode ||
        browserAgent.includes("embed")
      ) {
        $context.isEmbed = true;
        $appStore.launchContext = LaunchContext.EMBED;
      }
      const isDebugHandheldMode =
        import.meta.env.VITE_IS_DEBUG_HANDSET === "true";
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
        $appStore.embedContext = EmbedContext.SHEET;
        if (sheetPath) $appStore.sheetPath = sheetPath;
      }
    } catch (e) {
      postToParent({ type: "ERROR", message: e });
    }
  }
  function addWindowEventListeners() {
    // window?.addEventListener("visibilitychange", visibilityChangeListener);
    // window?.addEventListener("resize", windowResizeListener);
    // window?.addEventListener("click", windowClickEventListener);
    // window?.addEventListener("message", messageReceivedListener);
    window.onpopstate = () => {
      appStore.setCurrentPath(document.location.pathname);
    };
  }
</script>

{#if $appStore?.appData?.isAnalyticsEnabled}
  <AnalyticsLayer />
{/if}
<title>{$appStore.appData.name}</title>
<div class="flex h-screen w-screen">
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
{#if $appStore.isDebugMode}
  <DebugLayer />
{/if}
{#if $appLoadingState.isBaseLoaded}
  <ModalLayer />
  <Shortcuts />
{/if}
<Intercom />
<CacheLayer />
<svelte:window
  on:resize={windowResizeListener}
  on:click={windowClickEventListener}
  on:message={messageReceivedListener}
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
