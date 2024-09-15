<script lang="ts">
  import { onMount, tick, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Embed } from "$lib/client/types/context.type";
  import { pingParent, postToParent } from "$lib/client/utils/embed.utils";
  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import { appStore, currentTime } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import ThemeLayer from "./themeLayer/ThemeLayer.svelte";
  import {
    detectSystemOS,
    detectTouchDevice
  } from "$lib/client/utils/browser.utils";
  import { extractProduct } from "$lib/shared/utils/utils";
  import { AlertType } from "$lib/client/types/notification.type";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { LogType } from "$lib/client/components/debug/debug.type";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import MetadataLayer from "./MetadataLayer.svelte";
  import { Persistence } from "$lib/client/persistence/persistence";

  let timer: any;
  pingParent();

  onMount(async () => {
    await bootup();
    view.update(window.innerWidth, window.innerHeight);
    await refreshAppStaticData();
    return () => {
      clearInterval(timer);
    };
  });

  const visibilityChangeListener = async (event: Event) => {
    if (document?.hidden) return;
    pingParent();
  };
  /**
   * Sets up the app for the first time when the app is loaded.
   *
   * Note: The order of operations is important as later operations rely on earlier ones.
   */
  async function bootup() {
    await setLaunchContext();
    addWindowEventListeners();
    runCurrentTime();
    appStore.setCurrentPath(window.location.pathname);
    initializeServiceWorker();
    await checkForEnvironmentChange();
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

  /**
   * Sets the launch context of the app. This includes the product, debug mode, embed mode, touch device, protocol, and OS.
   */
  async function setLaunchContext() {
    try {
      let dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
      if (!dapId) {
        dapId = generateSimpleRandomId();
        clientStorage.set(ClientStorageKey.DAP_ID, dapId);
      }
      $context.dapId = dapId;
      const appDetails = extractProduct(
        import.meta.env?.VITE_HOST ??
          process.env.PLASMO_PUBLIC_APP_URL ??
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
  async function checkForEnvironmentChange() {
    const envCachedOnMachine = await clientStorage.get(ClientStorageKey.ENV);
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
      await account.signOut();
    }
  }
  function handleCustomNavigation(event: any) {
    logger.log({
      at: "handleCustomNavigation",
      event,
      path: event.detail?.path
    });
    if (event.detail?.isReload) {
      if (!$context.isEmbed) window.location.reload();
      else {
        goto(
          (import.meta.env?.VITE_CUSTOM_PROTOCOL ?? "blanklabs") +
            "://localhost/index.html"
        );
        // postToParent({ reload: true });
      }
    }
    const host = window.location.host;
    if (
      event.detail.path &&
      ((event.detail.path.includes("http") &&
        event.detail.path.includes(host)) ||
        !event.detail.path.includes("http"))
    )
      goto(event.detail.path);
    else if (event.detail.path) window.location = event.detail.path;
  }

  /**
   * Handles custom alert events from the app like network.utils and similar files where stores are directly used.
   *
   *
   * Disabling network error message for embed mode as on iOS and macOS app, sometimes the network call is failing with error "Load Failed" - which is only happening on iOS and macOS embed scenarios.
   * TODO - further investigation is required to understand the root cause of this issue.
   *
   * @param event
   */
  function handleCustomAlert(event: any) {
    if (event.detail) console.log("custom alert:", event.detail);
    if (event.detail?.error === "networkerror") {
      if (
        $context.isEmbed &&
        event.detail.message.tolowerCase().includes("load failed")
      ) {
        return;
      }
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
</script>

<div
  class={cn(
    "text-base text-fgs1 bg-bgs1 relative w-screen h-screen flex",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <MetadataLayer />
  <ThemeLayer>
    <slot />
  </ThemeLayer>
</div>
<svelte:document on:visibilitychange={visibilityChangeListener} />
