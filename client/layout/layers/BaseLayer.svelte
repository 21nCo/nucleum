<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { Embed } from "$lib/client/types/context.type";
  import { pingParent, postDataToParent } from "$lib/client/utils/embed.utils";
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
  import { cn } from "$lib/client/utils/ui.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import MetadataLayer from "./MetadataLayer.svelte";
  import PosthogTelemetry from "./analytics/PosthogTelemetry.svelte";
  import dynamicProductData from "$lib/product.json";
  import { getSettingsAsModal } from "../settingsActionMap";
  import { globalActions } from "$lib/client/stores/actionMap";
  import { EmbedDataMessage } from "$lib/client/types/embedMessage.enum";
  import { parse } from "$lib/shared/utils/json.utils";
  import { productData } from "$lib/client/products/product.resolver";
  import {
    product,
    resolveProductConfig
  } from "$lib/client/products/product.config";
  let timer: any;
  let isMounted = false;
  const productConfig = resolveProductConfig();

  onMount(async () => {
    if (browser) {
      pingParent();
      addWindowEventListeners();
    }
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
    setAppVersion();
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
        $currentTime = new Date();
      }, 1000);
    }
    function initializeServiceWorker() {
      if (!browser || $context.isEmbed) return;
      if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
        logger.debug({
          at: "BaseLayer.sw.register",
          message: "Service workers not supported"
        });
        return;
      }

      navigator.serviceWorker
        .register("/worker.js")
        .then((registration) => {
          logger.debug({
            at: "BaseLayer.sw.register",
            message: "Service worker registered",
            registration
          });
        })
        .catch((error) => {
          logger.error({
            at: "BaseLayer.sw.register",
            error,
            message: "Service worker registration failed"
          });
          if (error.name === "NetworkError") {
            logger.error({
              at: "BaseLayer.sw.register",
              message:
                "Network error during SW registration - offline features may be limited"
            });
          }
        });
    }
  }

  function initActions() {
    const isSheet = $context.isSheet;
    const localActions = productData.actions;
    const modifiedGlobalActions = globalActions.filter(
      (x) => !localActions.some((y) => y.action === x.action)
    );
    let actions = [...localActions, ...modifiedGlobalActions];
    if (isSheet) appStore.initActionsForSheet(actions);
    else appStore.initActions(actions, getSettingsAsModal());
  }

  function setAppVersion() {
    appStore.setVersion(productData.version, productData.build);
  }

  /**
   * Sets the launch context of the app. This includes the product, debug mode, embed mode, touch device, protocol, and OS.
   */
  async function setLaunchContext() {
    try {
      const dapId = await getDapId();
      $context.dapId = dapId;
      const appDataFromUrl = extractProduct(
        import.meta.env?.VITE_HOST ??
          process.env.PLASMO_PUBLIC_APP_URL ??
          window.location.host
      );
      const appDetails = {
        product,
        env: appDataFromUrl.env ?? "live"
      };
      if (appDetails) appStore.initializeProductInformation(appDetails);
      const cachedAppData = await clientStorage.get(ClientStorageKey.APP_DATA);
      const cachedAppDataJson = parse(cachedAppData ?? "{}");

      let data =
        cachedAppDataJson &&
        cachedAppDataJson?.dataVersion >= dynamicProductData?.dataVersion
          ? {
              ...cachedAppDataJson
            }
          : {
              ...dynamicProductData
            };
      data = {
        ...data,
        name: productConfig.name,
        version: productData.version,
        build: productData.build
      };
      appStore.loadAppData(data, {
        isDefaultData: true
      });
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
      $context.isInOfflineMode =
        isInOfflineMode === "true" || !navigator.onLine;
      const isInLowDataMode = await clientStorage.get(
        ClientStorageKey.LOW_DATA_MODE
      );
      if (isInLowDataMode)
        $context.isInLowDataMode = isInLowDataMode === "true";
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : JSON.stringify(e);

      postDataToParent(EmbedDataMessage.ERROR, {
        type: "ERROR",
        message: errorMessage
      });
    }
  }

  /**
   * Checks if the environment has changed and signs out the user if the environment has changed to avoid issues of using the cached token and 401 errors.
   */
  async function checkForEnvironmentChange() {
    const envCachedOnMachine = await clientStorage.get(ClientStorageKey.ENV);
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

  function handleUnhandledRejection(event: any) {
    logger.error({
      at: "GlobalPromiseErrorHandler",
      error: event.reason,
      message: event.reason?.message || "Unhandled Promise Rejection"
    });
    event.preventDefault();
  }

  function setupGlobalErrorHandler() {
    // For synchronous errors
    window.onerror = (message, source, lineno, colno, error) => {
      logger.error({
        at: "GlobalErrorHandler",
        error: error,
        message,
        source,
        lineno,
        colno
      });

      // Return true to prevent the error from bubbling up and crashing the app
      return true;
    };
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
      if (event.detail) {
        logger.info({ at: "handleCustomAlert", detail: event.detail });
      }
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

  function handleToggleSearchParam(event: any) {
    appStore.toggleSearchParam(event.detail);
  }

  function updateOnlineStatus() {
    $context.isInOfflineMode = !navigator.onLine;
  }

  function handleMessageFromChromeWebview(event: any) {
    const messageFromChromeWebView = event.data;
    logger.debug({
      at: "handleMessageFromChromeWebview",
      message: "Received from Chrome Webview",
      data: messageFromChromeWebView
    });
  }

  function handleViewportChange() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const hasKeyboard = window.innerHeight > viewport.height;
    if (hasKeyboard) {
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${viewport.height}px`
      );
    } else {
      document.documentElement.style.removeProperty("--viewport-height");
    }
  }

  function addWindowEventListeners() {
    // setupGlobalErrorHandler();
    // window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener(
      GlobalEvent.CUSTOM_NAVIGATION,
      handleCustomNavigation
    );
    window.addEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
    window.addEventListener(
      GlobalEvent.TOGGLE_SEARCH_PARAM,
      handleToggleSearchParam
    );
    window.onpopstate = () => {
      appStore.setCurrentPath(document.location.pathname);
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    // try {
    //   //@ts-ignore
    //   window.chrome.webview.addEventListener(
    //     "message",
    //     handleMessageFromChromeWebview
    //   );
    // } catch (error) {
    //   logger.error({
    //     at: "BaseLayer.addWindowEventListeners - webview listener",
    //     error
    //   });
    // }
    if ("visualViewport" in window) {
      const viewport = window.visualViewport;
      viewport?.addEventListener("resize", handleViewportChange);
      viewport?.addEventListener("scroll", handleViewportChange);
    }
  }
  function removeWindowEventListeners() {
    // window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    window.removeEventListener(
      GlobalEvent.CUSTOM_NAVIGATION,
      handleCustomNavigation
    );
    window.removeEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
    window.removeEventListener(
      GlobalEvent.TOGGLE_SEARCH_PARAM,
      handleToggleSearchParam
    );
    window.onpopstate = null;
    window.removeEventListener("online", updateOnlineStatus);
    window.removeEventListener("offline", updateOnlineStatus);
    if ("visualViewport" in window) {
      const viewport = window.visualViewport;
      viewport?.removeEventListener("resize", handleViewportChange);
      viewport?.removeEventListener("scroll", handleViewportChange);
    }
    // try {
    //   //@ts-ignore
    //   window.chrome.webview.removeEventListener(
    //     "message",
    //     handleMessageFromChromeWebview
    //   );
    // } catch (error) {
    //   logger.error({
    //     at: "BaseLayer.removeWindowEventListeners - webview listener",
    //     error
    //   });
    // }
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
    <div id="secondary-popovers"></div>
    <div id="tooltips"></div>
    <div id="toolbars"></div>
    <span id="global-sync-status" data-syncstatus="" data-syncfeedback="true"
    ></span>
  </ThemeLayer>
</div>
<PosthogTelemetry />
<svelte:document on:visibilitychange={visibilityChangeListener} />
<!-- Fallback for md links click handling -->
<svelte:window
  on:click={(e) => {
    if (e?.target?.tagName === "PLACEHOLDER" && e?.target?.dataset?.href) {
      appStore.openLink(e.target.dataset.href);
    }
  }}
/>

<style>
  /**
* user-select: none is used to provide native experience for touch devices
*/
  :global(body) {
    -webkit-user-select: none; /* Safari */
    -moz-user-select: none; /* Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently supported by Chrome, Edge, Opera and Firefox */
  }
</style>
