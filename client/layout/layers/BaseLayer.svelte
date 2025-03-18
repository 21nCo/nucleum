<script lang="ts">
  import { onMount, tick, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Embed } from "$lib/client/types/context.type";
  import { pingParent, postToParent } from "$lib/client/utils/embed.utils";
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
  import {
    clientStorage,
    getDapId
  } from "$lib/client/persistence/persistence.utils";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { generateSimpleRandomId } from "$lib/shared/utils/crypto.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import MetadataLayer from "./MetadataLayer.svelte";
  import EmbedTelemetry from "./analytics/EmbedTelemetry.svelte";
  import productData from "$lib/product.json";
  import { getSettingsAsModal } from "../settingsActionMap";
  import { globalActions } from "$lib/client/stores/actionMap";
  import { localActions } from "$local/localActionMap";
  import { fileEmbedChannel } from "$lib/client/components/files/fileEmbedChannel.store";

  let timer: any;
  let isMounted = false;
  pingParent();
  addWindowEventListeners();

  onMount(async () => {
    try {
      await bootup();
    } catch (e) {
      logger.error({ at: "BaseLayer.onMount", error: e });
    } finally {
      isMounted = true;
    }
  });
  onDestroy(() => {
    clearInterval(timer);
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
    await account.init();
    await setLaunchContext();
    initActions();
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

  function initActions() {
    const isSheet = $context.isSheet;
    const modifiedGlobalActions = globalActions.filter(
      (x) => !localActions.some((y) => y.action === x.action)
    );
    let actions = [...localActions, ...modifiedGlobalActions];
    if (isSheet) appStore.initActionsForSheet(actions);
    else appStore.initActions(actions, getSettingsAsModal());
  }

  /**
   * Sets the launch context of the app. This includes the product, debug mode, embed mode, touch device, protocol, and OS.
   */
  async function setLaunchContext() {
    try {
      const dapId = await getDapId();
      $context.dapId = dapId;
      const appDetails = extractProduct(
        import.meta.env?.VITE_HOST ??
          process.env.PLASMO_PUBLIC_APP_URL ??
          window.location.host
      );
      if (appDetails) appStore.initializeProductInformation(appDetails);
      const cachedAppData = await clientStorage.get(ClientStorageKey.APP_DATA);
      if (cachedAppData) {
        appStore.loadAppData(JSON.parse(cachedAppData), {
          isDefaultData: true
        });
      } else {
        appStore.loadAppData(productData, {
          isDefaultData: true
        });
      }
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
      const isInOfflineMode = await clientStorage.get(
        ClientStorageKey.OFFLINE_MODE
      );
      if (isInOfflineMode)
        $context.isInOfflineMode = isInOfflineMode === "true";
      const isInLowDataMode = await clientStorage.get(
        ClientStorageKey.LOW_DATA_MODE
      );
      if (isInLowDataMode)
        $context.isInLowDataMode = isInLowDataMode === "true";
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
          (import.meta.env?.VITE_CUSTOM_PROTOCOL ?? "tauri") +
            "://localhost/index.html"
        );
        // postToParent({ reload: true });
      }
    }
    const host = window.location.host;
    if (
      event.detail.path &&
      ((event.detail.path.includes("http") &&
        event.detail.path.includes(host) &&
        !event.detail.path.includes("/oauth/")) ||
        !event.detail.path.includes("http")) &&
      !event.detail.path.includes("mailto:") &&
      !event.detail.path.includes("//oauthsignin")
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
    try {
      if (event.detail) console.log("custom alert:", event.detail);
      if (event.detail?.error === "networkerror") {
        if (
          $context.isEmbed &&
          event.detail.message?.toLowerCase()?.includes("load failed")
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
    } catch (e) {
      logger.error({ at: "handleCustomAlert", error: e });
    }
  }

  function updateOnlineStatus() {
    $context.isInOfflineMode = !navigator.onLine;
  }

  function handleMessageFromParent(event: any) {
    try {
      if (event?.data?.type === "SWIFT_MESSAGE" && event?.data?.payload) {
        const parsed = JSON.parse(event.data.payload);
        console.log({
          at: "handleMessageFromParent - SWIFT_MESSAGE",
          parsed
        });
        if (parsed?.id && parsed?.data) {
          fileEmbedChannel.setFile(parsed.id, parsed.data);
        }
      }
    } catch (e) {
      logger.error({ at: "handleMessageFromParent", error: e });
    }
  }

  function handleMessageFromChromeWebview(event: any) {
    const messageFromChromeWebView = event.data;
    console.log("Received from Chrome Webview:", messageFromChromeWebView);
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
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    window.addEventListener("message", handleMessageFromParent);
    try {
      //@ts-ignore
      window.chrome.webview.addEventListener(
        "message",
        handleMessageFromChromeWebview
      );
    } catch (error) {
      logger.error(error);
    }
  }
  function removeWindowEventListeners() {
    window.removeEventListener(
      GlobalEvent.CUSTOM_NAVIGATION,
      handleCustomNavigation
    );
    window.removeEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
    window.onpopstate = null;
    window.removeEventListener("online", updateOnlineStatus);
    window.removeEventListener("offline", updateOnlineStatus);
    window.removeEventListener("message", handleMessageFromParent);
    try {
      //@ts-ignore
      window.chrome.webview.removeEventListener(
        "message",
        handleMessageFromChromeWebview
      );
    } catch (error) {
      logger.error(error);
    }
  }
  onDestroy(() => {
    removeWindowEventListeners();
  });
</script>

<div
  id="base"
  class={cn(
    "text-base text-fgs1 bg-bgs1 relative w-screen h-screen flex",
    $appearance.theme,
    $appearance.colorScheme.tailwindSelector
  )}
>
  <MetadataLayer />
  <ThemeLayer>
    {#if isMounted}
      <slot />
    {/if}
    <div id="popovers"></div>
    <div id="tooltips"></div>
    <div id="toolbars"></div>
    <span id="global-sync-status" data-syncstatus="" data-syncfeedback="true"
    ></span>
  </ThemeLayer>
</div>
<EmbedTelemetry />
<svelte:document on:visibilitychange={visibilityChangeListener} />
