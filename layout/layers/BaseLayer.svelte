<script lang="ts">
  import { onMount, tick } from "svelte";
  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    appEvents,
    appStore,
    currentTime,
    excludedPathsForRedirectionCheck,
    userPreferences,
    windowObject,
  } from "$lib/tidy/stores/app.store";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  import ModalLayer from "./ModalLayer.svelte";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { page } from "$app/stores";
  import {
    checkForUpdates,
    performRedirectionChecks,
    runBackendUpdate,
    performLoginStatusCheck,
    ping,
  } from "$lib/tidy/utils/account.utils";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { pingParent } from "$lib/tidy/utils/embed.utils";
  import AnalyticsLayer from "./AnalyticsLayer.svelte";
  const visibilityChangeListener = (event: Event) => {
    appEvents.publish(AppEvent.WINDOW_VISIBILITY_CHANGED, event);
  };
  const windowResizeListener = (event: Event) => {
    appEvents.publish(AppEvent.WINDOW_RESIZED, event);
  };
  const windowClickEventListener = (event: MouseEvent) => {
    appEvents.publish(AppEvent.WINDOW_CLICKED, event);
  };
  let timer: any;
  let isAnalyticsIdentifiersMapped = false;
  pingParent();
  bootup();
  onMount(async () => {
    await initializeData();
    if (
      $appStore?.appData?.isAnalyticsEnabled &&
      $userPreferences?.isAnonymousAnalyticsEnabled
    ) {
      const host = "dev.pointron.io"; //window.location.host;
      const gaTag =
        $appStore.appData?.gaTag ??
        $appStore.appData?.gaTags?.find((ga: any) => ga.host === host)?.tag;
      if (gaTag) {
        localStorage.setItem("gaTag", gaTag);
      }
      const clarityTag =
        $appStore.appData?.clarityTag ??
        $appStore.appData?.clarityTags?.find(
          (clarity: any) => clarity.host === host
        )?.tag;
      if (clarityTag) {
        localStorage.setItem("clarityTag", clarityTag);
      }
      isAnalyticsIdentifiersMapped = true;
    }
    const appEventSub = appEvents.subscribe(windowVisibilityHandler);
    return () => {
      appEventSub();
      clearInterval(timer);
      window?.removeEventListener("visibilitychange", visibilityChangeListener);
      window?.removeEventListener("resize", windowResizeListener);
      window?.removeEventListener("click", windowClickEventListener);
    };
  });
  async function windowVisibilityHandler(e: AppEventType) {
    if (e.event == AppEvent.WINDOW_VISIBILITY_CHANGED) {
      if (e.value && !document?.hidden) {
        console.log("performing redirection checks", $windowObject.currentPath);
        if (
          !excludedPathsForRedirectionCheck.includes(
            $windowObject.currentPath.split("/")[1]
          )
        ) {
          let isValid = await performLoginStatusCheck();
          if (isValid) {
            await checkForUpdates();
            await ping();
          }
        }
        pingParent(true);
      }
    }
  }
  function bootup() {
    setLaunchContext();
    addWindowEventListeners();
    runCurrentTime();
    windowObject.setCurrentPath(window.location.pathname);
  }
  async function initializeData() {
    //todo - check if the saved timezone is different from current user timezone
    await initializeAppData();
    const currentVersion = $appStore.appData.version;
    if (
      !excludedPathsForRedirectionCheck.includes(
        $windowObject.currentPath.split("/")[1]
      )
    ) {
      const isProceed = await performRedirectionChecks();
      if (isProceed) {
        let result = await checkForUpdates(currentVersion);
        if (!result) await runBackendUpdate();
        else await ping();
      }
    }
  }
  async function initializeAppData() {
    const app = import.meta.env.VITE_APP ?? window.location.hostname;
    if (!app) return;
    await new Persistance().initializeAppData(app);
  }
  function runCurrentTime() {
    clearInterval(timer);
    timer = setInterval(() => {
      tick();
      $currentTime = new Date();
    }, 1000);
  }
  function setLaunchContext() {
    let subdomain = window?.location.host.split(".")[0];
    let isSheet = $page.url?.searchParams?.get("isSheet");
    // console.log({ subdomain, location: window?.location });
    //$appStore.launchContext = LaunchContext.EMBED;
    if (subdomain?.includes("embed") || $appStore.isDebugEmbedMode) {
      $appStore.launchContext = LaunchContext.EMBED;
    }
    if (isSheet) {
      $appStore.embedContext = EmbedContext.SHEET;
    }
  }
  function addWindowEventListeners() {
    window?.addEventListener("visibilitychange", visibilityChangeListener);
    window?.addEventListener("resize", windowResizeListener);
    window?.addEventListener("click", windowClickEventListener);
    window.onpopstate = () => {
      windowObject.setCurrentPath(document.location.pathname);
    };
  }
</script>

{#if $appStore?.appData?.isAnalyticsEnabled && isAnalyticsIdentifiersMapped}
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
