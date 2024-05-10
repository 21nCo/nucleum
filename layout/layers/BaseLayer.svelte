<script lang="ts">
  import { onMount, tick } from "svelte";
  import DebugLayer from "./debug/DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    appLoadingState,
    appStore,
    currentTime,
    excludedPathsForRedirectionCheck,
    userPreferences
  } from "$lib/tidy/stores/app.store";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  import ModalLayer from "./ModalLayer.svelte";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { page } from "$app/stores";
  import {
    checkForUpdates,
    performRedirectionChecks,
    runDboUpdate,
    performLoginStatusCheck,
    ping
  } from "$lib/tidy/utils/account.utils";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { pingParent, postToParent } from "$lib/tidy/utils/embed.utils";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import Shortcuts from "./Shortcuts.svelte";
  import { extractProduct } from "$lib/tidy/utils/utils";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { logger } from "$lib/tidy/stores/log.store";
  import view from "$lib/tidy/stores/view.store";
  import actions from "$lib/tidy/stores/actions.store";
  import account from "$lib/tidy/stores/account.store";
  import appearance from "$lib/tidy/stores/appearance.store";
  import { detectTimeZone } from "$lib/tidy/utils/time.utils";
  import { appEvents } from "$lib/tidy/stores/notification.store";
  import context from "$lib/tidy/stores/context.store";
  import { Embed } from "$lib/tidy/types/context.type";

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
    let isValid = await performLoginStatusCheck();
    if (!isValid) return;
    dataManager.refreshOnAppear();
    checkForUpdates();
    ping();

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
      if (e.value) dataManager.initialize();
    } else if (e.event === AppEvent.USER_SIGNUP) {
      //TODO - load seed data - delegation via DataManager - for all kvo stores load and save seed data on cloud on signup
      userPreferences.loadSeedData();
      refreshTimeZone(true);
      dataManager.initialize();
    }
  }
  function bootup() {
    refreshTimeZone();
    setLaunchContext();
    addWindowEventListeners();
    runCurrentTime();
    view.setCurrentPath(window.location.pathname);
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
    new Persistance().initializeAppData();
    if ($account.isLoggedIn) await dataManager.initialize();
    actions.updateSettingsActionMap();
    const currentVersion = $appStore.appData.version;
    if (
      !excludedPathsForRedirectionCheck.includes(
        $view.currentPath.split("/")[1]
      )
    ) {
      const isProceed = await performRedirectionChecks();
      if (isProceed) {
        let result = await checkForUpdates(currentVersion);
        if (!result) await runDboUpdate();
        else await ping();
      }
    }
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
      const host = import.meta.env.VITE_APP ?? window.location.host;
      const appDetails = extractProduct(host);
      appStore.initializeProductInformation(appDetails);
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
        if (sheetPath) $view.sheetPath = sheetPath;
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
      view.setCurrentPath(document.location.pathname);
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
<ModalLayer />
<Shortcuts />
<Intercom />
<CacheLayer />
<svelte:window
  on:resize={windowResizeListener}
  on:click={windowClickEventListener}
  on:message={messageReceivedListener}
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
