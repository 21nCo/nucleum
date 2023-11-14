<script lang="ts">
  import { onMount, tick } from "svelte";
  import DebugLayer from "./DebugLayer.svelte";
  import ThemeLayer from "./ThemeLayer.svelte";
  import {
    appEvents,
    appStore,
    currentTime,
    postMessageToParent,
    userPreferences,
  } from "$lib/tidy/stores/app.store";
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  import ModalLayer from "./ModalLayer.svelte";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import { page } from "$app/stores";
  import {
    checkForUpdates,
    performRedirectionChecks,
    onBoardingStatusCheck,
    runBackendUpdate,
    performLoginStatusCheck,
  } from "$lib/tidy/utils/account.utils";
  import { Persistance } from "$lib/tidy/stores/persistance";
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
  postMessageToParent({
    ping: true,
  });
  bootup();
  onMount(async () => {
    await initializeData();
    const appEventSub = appEvents.subscribe(async (e) => {
      if (e.event == AppEvent.WINDOW_VISIBILITY_CHANGED) {
        if (e.value && !document?.hidden) {
          let isValid = await performLoginStatusCheck();
          if (isValid) await checkForUpdates();
          setTimeout(() => {
            postMessageToParent({
              ping: true,
            });
          }, 2500);
        }
      }
    });
    return () => {
      appEventSub();
      clearInterval(timer);
      window?.removeEventListener("visibilitychange", visibilityChangeListener);
      window?.removeEventListener("resize", windowResizeListener);
      window?.removeEventListener("click", windowClickEventListener);
    };
  });
  function bootup() {
    setLaunchContext();
    addWindowEventListeners();
    runCurrentTime();
    inject({ mode: dev ? "development" : "production" });
  }
  async function initializeData() {
    //todo - check if the saved timezone is different from current user timezone
    await initializeAppData();
    const currentVersion = $appStore.appData.version;
    const isProceed = await performRedirectionChecks();
    if (isProceed) {
      let result = await checkForUpdates(currentVersion);
      if (!result) await runBackendUpdate();
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
  }
</script>

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
