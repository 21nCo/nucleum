<script lang="ts">
  import { onMount, tick } from "svelte";
  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    account,
    appEvents,
    appStore,
    currentTime,
    excludedPathsForRedirectionCheck,
    windowObject
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
    ping
  } from "$lib/tidy/utils/account.utils";
  import { Persistance } from "$lib/tidy/stores/persistance";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { pingParent } from "$lib/tidy/utils/embed.utils";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import Shortcuts from "./Shortcuts.svelte";
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
  pingParent();
  bootup();
  onMount(async () => {
    await parseEmbedToken();
    await initializeData();
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
  async function parseEmbedToken() {
    const token = $page.url?.searchParams?.get("token");
    const isSignup = $page.url?.searchParams?.get("signup");
    if (token) {
      await account.embedOAuthSignin(token, isSignup === "true" ?? false);
    }
  }
  async function initializeData() {
    //todo - check if the saved timezone is different from current user timezone
    await new Persistance().initializeAppData();
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
