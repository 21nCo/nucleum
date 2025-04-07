<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import { detectTimeZone } from "$lib/client/utils/time.utils";
  import { Persistence } from "$lib/client/persistence/persistence";
  import view from "$lib/client/stores/view.store";
  import account from "$lib/client/stores/account.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import {
    confirmationNotification,
    toasts
  } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import DebugLayer from "./debug/DebugLayer.svelte";
  import ModalLayer from "./ModalLayer.svelte";
  import AnalyticsLayer from "./analytics/AnalyticsLayer.svelte";
  import ShortcutRunner from "../../components/shortcuts/ShortcutRunner.svelte";
  import Intercom from "./Intercom.svelte";
  import CacheLayer from "./CacheLayer.svelte";
  import {
    localCacheableStores,
    remoteOnlyStores
  } from "$local/localStoresMap";
  import { searcheableResources } from "$local/local";
  import {
    dispatchCustomEvent,
    isExtensionEnvironment,
    safeRequestIdleCallback
  } from "$lib/client/utils/browser.utils";
  import { appMenuStore } from "../../stores/appMenu/appMenu.store";
  import { AlertType } from "$lib/client/types/notification.type";
  import { cacheableStores } from "$lib/client/stores/globalStoresMap";
  import AppLoadingView from "../paint/AppLoadingView.svelte";
  import DynamicMetadataLayer from "./DynamicMetadataLayer.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { LogType } from "$lib/client/components/debug/debug.type";
  import { flux, initFlux } from "$lib/client/components/flux/flux";
  import {
    UserDataMode,
    UserSessionType
  } from "$lib/client/types/account.type";
  import { PersistenceProvider } from "$lib/client/persistence/persistence.type";
  import { getDapId } from "$lib/client/persistence/persistence.utils";
  import PageError from "$lib/client/components/error/PageError.svelte";
  import { SurrealPersistence } from "$lib/client/persistence/surreal/surreal.local";
  import { Embed } from "$lib/client/types/context.type";
  import posthog from "posthog-js";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import { initializeTaco } from "$lib/client/products/memotron/taco/taco.store";
  import { recentsStore } from "$lib/client/components/record/recent.store";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { Action } from "$lib/client/types/action.enum";
  import ZohoSalesIq from "./support/ZohoSalesIQ.svelte";
  import {
    BillingCycle,
    PlanType
  } from "$lib/client/components/subscription/userPlan.type";
  import { fileEmbedChannel } from "$lib/client/components/files/fileEmbedChannel.store";
  import { ErrorMessage } from "$lib/client/components/error/error.type";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { PaymentProvider } from "$lib/shared/types/plan.type";
  import { embedChannel } from "$lib/client/components/embed/embed.store";

  const loadingMessages = {
    cloneUp: {
      message: "Syncing your local data with the cloud...",
      subMessage: "This might take a while."
    },
    syncDown: {
      message: "Syncing your data from cloud..."
    },
    cloneDown: {
      message: "Setting things up..."
    }
  };

  let loadingMessage: {
    message: string;
    subMessage?: string;
  } = {
    message: ""
  };
  let isAppLoading = false;
  let error: string | null = null;
  let dev_isDisableSyncOnAppear = false;
  let subs: any[] = [];
  const isDebug = import.meta.env?.DEV;

  onMount(async () => {
    if ((<any>window).Intercom)
      (<any>window).Intercom("update", {
        hide_default_launcher: true
      });
    addWindowEventListeners();
    refreshUIStateDerived();
    const uiStateSub = uiState.subscribe(() => {
      refreshUIStateDerived();
    });
    subs.push(uiStateSub);

    console.time("init");
    const initState = await initializeDatabase();
    refreshAppMenuDefaults(false);
    let userDataState: any;
    if (initState !== undefined)
      userDataState = await initializeEssentialUserData(initState);
    $appLoadingState.isBaseLoaded = true;
    const promises = [
      recentsStore.refresh(searcheableResources),
      initializeUserConfig()
    ];
    await Promise.all(promises);

    dispatch("ready");
    console.timeEnd("init");

    safeRequestIdleCallback(async () => {
      if (userDataState?.paginateResources) {
        toasts.showProgress("paginate", "Syncing in the background");
        await flux.paginateResources(userDataState.paginateResources, 100);
        dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
        toasts.closeProgress("paginate");
      } else if (userDataState?.counts && !isDebug) {
        toasts.showProgress("reconcile", "Syncing in the background");
        await flux.reconcile({ counts: userDataState.counts });
        dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
        toasts.closeProgress("reconcile");
      }
      await recentsStore.refresh(searcheableResources);
      await syncAccountPaidPlanFromExternalProvider();
      initializeTaco();
    });
  });

  function refreshUIStateDerived() {
    const interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      isProductScoped: true
    });
    $appStore.interactionMode = interactionMode;
  }
  /**
   * Refreshes the timezone of the user. If the user is signing up, it will set & persist the timezone to the detected timezone. If the user is logged in, it will set the timezone to the detected timezone only if the timezone is different from the saved timezone.
   *
   * TODO - Prompt user if timezone change detected before directly setting the timezone.
   *
   * @param isSignup - If the user is signing up
   */
  function refreshTimeZone() {
    const timeZone = detectTimeZone();
    if (!timeZone || !$userPreferences) return;
    if ($userPreferences.timeZoneOffset !== timeZone.offset * 60) {
      logger.info({
        at: "refreshTimeZone - timezone change detected",
        timeZone
      });
      return userPreferences.setTimeZone(timeZone.offset * 60, timeZone.label);
    }
  }

  /**
   * Disabled visibility change listener for onAppear() - using focus event instead as visibilitychange only get triggered when the tab is switched not the window.
   * @param event
   */
  const visibilityChangeListener = async (event: Event) => {
    if (document?.hidden) return;
    // await onAppear();
  };

  async function onAppear() {
    try {
      refreshTimeZone();
      const isCloudUser = $account.dataMode === UserDataMode.CLOUD;
      if (isCloudUser && !dev_isDisableSyncOnAppear) {
        await flux.syncDown({ src: "onAppear" });
        await recentsStore.refresh(searcheableResources);
        await account.ping();
      }
      if (isExtensionEnvironment() || isDebug) return;
      performAppUpdateCheck();
    } catch (e) {
      logger.error({ at: "onAppear", error: e });
    }
  }

  /**
   * Checks if the app version on client is different from the version on server. If the versions are different, it will run the dbo update and prompt user to reload the app if it is a web app.
   */
  async function performAppUpdateCheck() {
    const versionOnClient = $appStore.version;
    await refreshAppStaticData();
    const latestVersion = resolveLatestVersion();
    if (versionOnClient !== latestVersion) {
      if (!$context.isEmbed) {
        toasts.trigger({
          id: "appUpdateAvailable",
          title: `App update available (v${latestVersion}) 🎉`,
          type: AlertType.INFO,
          actionText: "Reload",
          callback: () => {
            window.location.reload();
          }
        });
      }
    }
    logger.info({
      at: "operformAppUpdateCheck",
      versionOnClient,
      latestVersion
    });

    function resolveLatestVersion() {
      const availability = $appStore.appData?.availability;
      if (!availability) return;
      const ctx = !$context.isEmbed ? "web" : $context.os?.toLowerCase();
      const updated = availability[ctx];
      if (!updated) return;
      return updated;
    }
  }

  const windowResizeListener = (event: Event) => {
    view.refresh(window.innerWidth, window.innerHeight);
  };

  /**
   * Initializes the app with necessary data and runs dbo update. For this, the app should have already mounted and all stores should be available.
   *
   * Note: The order of operations is important as later operations rely on earlier ones.
   * @param isLiteMode
   */
  async function initializeDatabase(): Promise<number | undefined> {
    try {
      const isLiteMode = $context.isSheet;
      logger.log({
        at: "UserBaseLayer.initializeData",
        isLiteMode,
        account: $account
      });
      if (!isLiteMode && !isDebug) {
        await refreshAppStaticData();
      }
      const dapId = await getDapId();

      if ($account.dataMode === UserDataMode.LOCAL) {
        // loadingMessage = "Initializing...";
        await account.logGuest(dapId!);
        const initState = await initializeFlux({
          dapId: dapId!
        });
        logger.log({
          at: "UserBaseLayer.initializeData - local",
          initState
        });
        if (initState === 0) await flux.kvSeed();
        else await flux.loadInMemoryStores();
        return initState;
      }
      if (!$account.userId) {
        error = "User id not found. Please try again later.";
        return;
      }
      let initState = await initializeFlux({
        userId: $account.userId,
        dapId: dapId!
      });
      await flux.seed();
      logger.log({
        at: "UserBaseLayer.initializeData - cloud",
        initState,
        os: $context.os,
        isEmbed: $context.isEmbed,
        embed: $context.embed,
        userAgent: navigator.userAgent
      });
      return initState;
    } catch (e) {
      logger.error({ at: "initializeDatabase", error: e });
    }
  }

  async function initializeFlux(params: { dapId: string; userId?: string }) {
    return initFlux(
      [...cacheableStores, ...localCacheableStores],
      PersistenceProvider.SURREAL_SURREAL,
      new SurrealPersistence(),
      {
        ...params,
        appVersion: $appStore.version + "." + $appStore.build,
        remoteOnlyStores: [...remoteOnlyStores]
      }
    );
  }

  async function initializeEssentialUserData(initState: number): Promise<
    | {
        paginateResources?: any;
        counts?: any;
      }
    | undefined
  > {
    if ($account.dataMode === UserDataMode.LOCAL) {
      return;
    }
    if ($account.sessionType === UserSessionType.NEW) {
      if (initState === 2) {
        loadingMessage = loadingMessages.cloneUp;
        await flux.cloneUp();
      } else {
        await flux.kvSeed();
      }
    } else if ($account.sessionType === UserSessionType.RETURNING) {
      if (initState === 0) {
        loadingMessage = loadingMessages.cloneDown;
        const result = await flux.initializeEssentialDataForCloudUser();
        if (typeof result === "object" && result?.ifrCloneResult) {
          return result.ifrCloneResult;
        }
      } else {
        loadingMessage = loadingMessages.syncDown;
        return flux.initialSyncDown();
      }
    }
  }

  async function initializeUserConfig() {
    console.time("initializeUserConfig");
    const isLiteMode = $context.isSheet;
    if ($account.dataMode === UserDataMode.CLOUD && !isLiteMode) {
      refreshTimeZone();
      setAnalyticsUserIdentity();
      await account.ping();
    }
    refreshAppMenuDefaults();
    console.timeEnd("initializeUserConfig");
    function setAnalyticsUserIdentity() {
      if (!$account.userInfo) return;
      posthog.identify($account.userInfo.id, {
        region: $account.userInfo.region
      });
    }
  }

  function refreshAppMenuDefaults(isPersist?: boolean) {
    const defaultAppMenu = $appStore.appData?.appMenu ?? [];
    const defaultAppMenuMobile = $appStore.appData?.appMenuMobile ?? [];
    const appMenuDefaults = {
      all: defaultAppMenu,
      mobile: defaultAppMenuMobile
    };
    appMenuStore.setDefaults(
      appMenuDefaults,
      isPersist ?? $account.dataMode === UserDataMode.CLOUD
    );
  }

  /**
   * TODO - load static data (not from url)
   * Refreshes the app static data from the server.
   */
  async function refreshAppStaticData() {
    try {
      const appData = await new Persistence().fetchAppData($appStore.env);
      if (!appData) {
        throw new Error("App data not found");
      }
      appStore.loadAppData(appData);
    } catch (e) {
      logger.error({ at: "refreshAppStaticData", error: e });
    }
  }

  async function syncAccountPaidPlanFromExternalProvider() {
    if (
      $account.dataMode === UserDataMode.LOCAL ||
      !$account.plan?.provider ||
      $account.plan?.provider === PaymentProvider.SELF ||
      $account.plan?.cycle === BillingCycle.LIFETIME
    )
      return;
    const response = await account.modifySubscription({
      type: "sync"
    });
    if (response.userPlan) {
      account.handlePlanStatus(response.userPlan);
    }
  }

  function handlePersistAppearance(event: any) {
    userPreferences.setAppearance(event.detail);
  }

  function handleAppLoadingStatus(event: any) {
    logger.log({ at: "handleAppLoadingStatus", event });
    const detail = event.detail;
    if (detail.message || detail.subMessage) {
      isAppLoading = true;
    }
    if (detail.isFinished) {
      setTimeout(() => {
        isAppLoading = false;
      }, 500);
    }
    if (detail.message !== undefined) {
      loadingMessage.message = detail.message;
    }
    if (detail.subMessage !== undefined) {
      loadingMessage.subMessage = detail.subMessage;
    }
  }

  function handleAddToRecents(event: any) {
    logger.log({ at: "handleAddToRecents", event });
    const { record, type, timestamp } = event.detail;
    recentsStore.add(record, {
      type,
      timestamp
    });
  }

  async function handleMessageFromParent(event: any) {
    try {
      if (event?.data?.type === "SWIFT_MESSAGE" && event?.data?.payload) {
        const parsed = JSON.parse(event.data.payload);
        console.log({
          at: "handleMessageFromParent - SWIFT_MESSAGE",
          parsed
        });
        if (parsed.type === "PURCHASE_SUCCESS") {
          loadingMessage.message = "Verifying payment...";
          const response = await account.verifyPayment(
            parsed.nonce,
            parsed.embedTransaction
          );
          isAppLoading = false;
          modalEvent.hide(Action.USER_PLAN);
          if (response?.status === "success") {
            appStore.runAction(Action.PLAN_ONBOARDING);
          } else {
            toasts.error(ErrorMessage.DEFAULT);
          }
        } else if (parsed.type === "PURCHASE_ERROR") {
          isAppLoading = false;
          modalEvent.hide(Action.USER_PLAN);
          toasts.error(ErrorMessage.DEFAULT);
        } else if (parsed.type === "RESTORE_PURCHASE_SUCCESS") {
          const response = await account.modifySubscription({
            type: "sync",
            embedTransaction: parsed.embedTransaction
          });
        } else if (parsed?.type && parsed?.id && parsed?.data) {
          embedChannel.setData(parsed.id, parsed.type, parsed.data);
        } else if (parsed?.id && parsed?.data) {
          fileEmbedChannel.setFile(parsed.id, parsed.data);
        }
      }
    } catch (e) {
      logger.error({ at: "handleMessageFromParent", error: e });
    }
  }

  function addWindowEventListeners() {
    window.addEventListener(
      GlobalEvent.PERSIST_APPEARANCE_USER,
      handlePersistAppearance
    );
    window.addEventListener(
      GlobalEvent.APP_LOADING_STATUS,
      handleAppLoadingStatus
    );
    window.addEventListener(GlobalEvent.ADD_TO_RECENTS, handleAddToRecents);
    window.addEventListener("message", handleMessageFromParent);
  }
  function removeWindowEventListeners() {
    window.removeEventListener(
      GlobalEvent.PERSIST_APPEARANCE_USER,
      handlePersistAppearance
    );
    window.removeEventListener(
      GlobalEvent.APP_LOADING_STATUS,
      handleAppLoadingStatus
    );
    window.removeEventListener(GlobalEvent.ADD_TO_RECENTS, handleAddToRecents);
    window.removeEventListener("message", handleMessageFromParent);
  }
  function handleBeforeUnload(event: any) {
    if (
      !isDebug &&
      ($context.isInOfflineMode || $account.dataMode === UserDataMode.LOCAL)
    ) {
      event.preventDefault();
      event.returnValue = "";
      // confirmationNotification.notify({
      //   title: "You are offline.",
      //   message:
      //     "Reloading the page may not load the app again if you are not connected to the internet",
      //   type: AlertType.WARNING,
      //   confirmAction: {
      //     label: "Reload",
      //     callback: async () => {
      //       window.location.reload();
      //     }
      //   }
      // });
    }
  }
  onDestroy(() => {
    removeWindowEventListeners();
    subs.forEach((sub) => sub());
  });
</script>

{#if $appStore?.appData?.isAnalyticsEnabled && $account?.dataMode === UserDataMode.CLOUD && !$context.isInOfflineMode}
  <AnalyticsLayer />
{/if}
<div class="flex h-screen w-screen">
  {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded || isAppLoading}
    <AppLoadingView
      message={loadingMessage.message}
      subMessage={loadingMessage.subMessage}
    />
  {:else if error}
    <PageError />
  {:else}
    <slot />
  {/if}
</div>
{#if $appStore.isDebugMode}
  <DebugLayer />
{/if}
{#if $appLoadingState.isBaseLoaded}
  <DynamicMetadataLayer />
  <ModalLayer />
  <ShortcutRunner />
  <CacheLayer />
{/if}
<Intercom />
{#if $account.plan?.plan === PlanType.NUCLEUS && !$view.isConstrainedWidth}
  <ZohoSalesIq />
{/if}

<svelte:window
  on:resize={windowResizeListener}
  on:focus={onAppear}
  on:beforeunload={handleBeforeUnload}
  on:unload={handleBeforeUnload}
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
