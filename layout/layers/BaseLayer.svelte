<script lang="ts">
  import { onMount, tick } from "svelte";
  import DebugLayer from "./debug/DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    account,
    actions,
    appEvents,
    appLoadingState,
    appStore,
    currentTime,
    excludedPathsForRedirectionCheck,
    userPreferences,
    view
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
  const visibilityChangeListener = (event: Event) => {
    appEvents.publish(AppEvent.WINDOW_VISIBILITY_CHANGED, event);
  };
  const windowResizeListener = (event: Event) => {
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
    await parseEmbedToken();
    await initializeData();
    const appEventSub = appEvents.subscribe(appEventHandler);
    $appLoadingState.isBaseLoaded = true;
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
    if (e.event == AppEvent.WINDOW_VISIBILITY_CHANGED) {
      if (e.value && !document?.hidden) {
        console.log("performing redirection checks", $view.currentPath);
        if (
          !excludedPathsForRedirectionCheck.includes(
            $view.currentPath.split("/")[1]
          )
        ) {
          let isValid = await performLoginStatusCheck();
          if (isValid) {
            dataManager.refreshOnAppear();
            checkForUpdates();
            ping();
          }
        }
        pingParent(true);
      }
    } else if (e.event === AppEvent.USER_LOGIN) {
      if (e.value) dataManager.initialize();
    } else if (e.event === AppEvent.USER_SIGNUP) {
      userPreferences.loadSeedData();
      dataManager.initialize();
    }
  }
  function bootup() {
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
    //new Persistance().initializeAppData();
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
      let isSheet = $page.url?.searchParams?.get("isSheet");
      let isDebugMode =
        $page.url?.searchParams?.get("debug") ||
        import.meta.env.VITE_DEBUG_MODE === "true";
      // console.log({ isSheet, isDebugMode });
      if (isDebugMode) {
        $appStore.isDebugMode = true;
      }
      // console.log({ subdomain, location: window?.location });
      //$appStore.launchContext = LaunchContext.EMBED;
      let browserAgent = navigator?.userAgent;
      if (
        subdomain?.includes("embed") ||
        $appStore.isDebugEmbedMode ||
        browserAgent.includes("embed")
      ) {
        $appStore.launchContext = LaunchContext.EMBED;
      }
      if (isSheet) {
        $appStore.embedContext = EmbedContext.SHEET;
      }
    } catch (e) {
      postToParent({ type: "ERROR", message: e });
    }
  }
  function addWindowEventListeners() {
    window?.addEventListener("visibilitychange", visibilityChangeListener);
    window?.addEventListener("resize", windowResizeListener);
    window?.addEventListener("click", windowClickEventListener);
    window?.addEventListener("message", messageReceivedListener);
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
