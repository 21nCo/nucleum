<svelte:options runes={true} />

<script lang="ts">
  import { initializeServiceWorker } from "@nucleum/client/runtime/service-worker/register";
  import { resolveLaunchHost } from "@nucleum/client/runtime/launch-context";
  import { initializeBrowserContext } from "@nucleum/client/runtime/browser-context";
  import { determineIfOffline } from "@nucleum/client/runtime/connectivity";
  import { loadInitialProductData } from "@nucleum/shared-state/app-context/product-data";
  import { checkForEnvironmentChange } from "@nucleum/surfaces/account/environment-session";
  import { handleCustomAlert } from "@nucleum/shared-state/notifications/browser-alerts";
  import { installBrowserNavigation } from "@nucleum/shell/navigation/browser-navigation";
  import { createBrowserLayout } from "@nucleum/shell/layers/browser-layout";
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import { installApplicationHosts } from "@nucleum/composition/configure-hosts";
  import type { Snippet } from "svelte";
  import { onMount, onDestroy, setContext } from "svelte";
  import { PRODUCT_NAV_CONTEXT } from "@nucleum/shell/navigation/product-nav-context";
  import { page } from "$app/stores";

  import { browser } from "$app/environment";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";

  import {
    pingParent,
    postDataToParent
  } from "@nucleum/client/runtime/embed/embed.utils";

  import { accountSession } from "@nucleum/surfaces/account/account-session";
  import {
    appStore,
    currentTime
  } from "@nucleum/shared-state/app-context/app.store";

  import context from "@nucleum/client/runtime/context.store";
  import ThemeLayer from "@nucleum/shell/layers/themeLayer/ThemeLayer.svelte";

  import { extractProduct } from "@21n/shared-utils/product-host";

  import { logger } from "@nucleum/client/runtime/logging/logger";

  import { clientStorage } from "@nucleum/persistence/client-storage";
  import { getDapId } from "@nucleum/persistence/device-id";
  import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
  import { cn } from "@21n/ui/environment/presentation";
  import appearance from "@nucleum/shared-state/appearance/appearance.store";
  import MetadataLayer from "@nucleum/shell/layers/MetadataLayer.svelte";
  import { installPosthogTelemetry } from "@nucleum/client/runtime/telemetry/posthog";
  import dynamicProductData from "$lib/product.json";
  import { getSettingsAsModal } from "@nucleum/composition/settings-actions";
  import { globalActions } from "@nucleum/composition/global-commands";
  import { EmbedDataMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";
  import { updateNucleumDatafnConnectivity } from "@nucleum/datafn/datafn.store";

  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import {
    product,
    resolveProductConfig
  } from "@nucleum/products/product.config";

  import { initDevLogCapture } from "@nucleum/client/runtime/logging/dev-log-capture";

  onDestroy(installApplicationHosts());

  let {
    children,
    productData
  }: {
    children?: Snippet;
    productData: { actions: IAction[]; version: string; build: number };
  } = $props();
  let timer: any;
  let isMounted = $state(false);
  const browserLayout = createBrowserLayout();
  let disposeWindowEvents: (() => void) | undefined;
  const productConfig = resolveProductConfig();
  setContext(PRODUCT_NAV_CONTEXT, productConfig);

  onMount(() => {
    if (import.meta.env.VITE_NATIVE_EMBED !== "true")
      return installPosthogTelemetry();
  });

  onMount(async () => {
    if (browser) {
      initDevLogCapture({ product });
      pingParent();
      const disposeNavigation = installBrowserNavigation();
      const disposeLayout = browserLayout.install();
      document.addEventListener("visibilitychange", visibilityChangeListener);
      window.addEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
      window.addEventListener("online", updateOnlineStatus);
      window.addEventListener("offline", updateOnlineStatus);
      disposeWindowEvents = () => {
        disposeNavigation();
        disposeLayout();
        document.removeEventListener(
          "visibilitychange",
          visibilityChangeListener
        );
        window.removeEventListener(GlobalEvent.CUSTOM_ALERT, handleCustomAlert);
        window.removeEventListener("online", updateOnlineStatus);
        window.removeEventListener("offline", updateOnlineStatus);
      };
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
    await accountSession.init();
    await setLaunchContext();
    initActions();
    runCurrentTime();
    navigation.setCurrentPath(window.location.pathname);
    initializeServiceWorker();
    await checkForEnvironmentChange();
    function runCurrentTime() {
      clearInterval(timer);
      timer = setInterval(() => {
        $currentTime = new Date();
      }, 1000);
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
      const appDataFromUrl = extractProduct(resolveLaunchHost());
      const appDetails = {
        product,
        env: appDataFromUrl.env ?? "live"
      };
      if (appDetails) appStore.initializeProductInformation(appDetails);
      await loadInitialProductData(dynamicProductData, {
        name: productConfig.name,
        version: productData.version,
        build: productData.build
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
      await initializeBrowserContext($page.url);
      const sheetPath = $page.url.searchParams.get("spath");
      if ($context.isSheet && sheetPath) $appStore.sheetPath = sheetPath;
      browserLayout.initialize($context);
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

  async function updateOnlineStatus() {
    try {
      const isOffline = Boolean(await determineIfOffline());
      $context.isInOfflineMode = isOffline;
      await updateNucleumDatafnConnectivity(isOffline);
    } catch (error) {
      logger.error({ at: "BaseLayer.updateOnlineStatus", error });
    }
  }

  onDestroy(() => {
    disposeWindowEvents?.();
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
      {@render children?.()}
    {/if}
    <div id="popovers"></div>
    <div id="secondary-popovers"></div>
    <div id="tooltips"></div>
    <div id="toolbars"></div>
  </ThemeLayer>
</div>
