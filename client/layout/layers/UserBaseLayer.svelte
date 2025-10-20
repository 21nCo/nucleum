<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { GlobalEvent } from "@21n/types/event.enum";
  import { detectTimeZone } from "@21n/utils/time.utils";
  import { Persistence } from "@21n/persistence/persistence";
  import account from "@21n/stores/account.store";
  import { appLoadingState, appStore } from "@21n/stores/app.store";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";
  import {
    confirmationNotification,
    toasts
  } from "@21n/stores/notification.store";
  import context from "@21n/stores/context.store";
  import DebugLayer from "@21n/layout/layers/debug/DebugLayer.svelte";
  import ModalLayer from "@21n/layout/layers/ModalLayer.svelte";
  import AnalyticsLayer from "@21n/layout/layers/analytics/AnalyticsLayer.svelte";
  import ShortcutRunner from "@21n/components/shortcuts/ShortcutRunner.svelte";
  import Intercom from "@21n/layout/layers/Intercom.svelte";
  import SyncLayer from "@21n/layout/layers/SyncLayer.svelte";
  import {
    dispatchCustomEvent,
    isExtensionEnvironment,
    safeRequestIdleCallback
  } from "@21n/utils/browser.utils";
  import { AlertType } from "@21n/types/notification.type";
  import AppLoadingView from "@21n/layout/paint/AppLoadingView.svelte";
  import DynamicMetadataLayer from "@21n/layout/layers/DynamicMetadataLayer.svelte";
  import { logger } from "@21n/components/debug/logger.client";
  import { flux, initFlux } from "@21n/components/flux/flux";
  import {
    UserDataMode,
    UserSessionType
  } from "@21n/types/account.type";
  import {
    ClientStorageKey,
    PersistenceProvider
  } from "@21n/persistence/persistence.type";
  import {
    clientStorage,
    getDapId
  } from "@21n/persistence/persistence.utils";
  import PageError from "@21n/components/error/PageError.svelte";
  import { SurrealPersistence } from "@21n/persistence/surreal/surreal.local";
  import { SignalDBPersistence } from "@21n/persistence/signaldb/signaldb.local";
  import { IndexedDBPersistence } from "@21n/persistence/indexeddb/indexeddb.local";
  import posthog from "posthog-js";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  import { recentsStore } from "@21n/components/record/recent.store";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { Action } from "@21n/types/action.enum";
  import { BillingCycle } from "@21n/components/subscription/userPlan.type";
  import { fileEmbedChannel } from "@21n/components/files/fileEmbedChannel.store";
  import { ErrorMessage } from "@21n/components/error/error.type";
  import modalEvent from "@21n/components/modal/modal.store";
  import { PaymentProvider } from "@21n/shared-types/plan.type";
  import { embedBridge } from "@21n/components/embed/embed.store";
  import { postMessageToParent } from "@21n/utils/embed.utils";
  import { EmbedMessage } from "@21n/types/embedMessage.enum";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { OperatingSystem } from "@21n/types/context.type";
  import InMemoryCache from "@21n/layout/layers/cache/InMemoryCache.svelte";
  import { resolveProductResources } from "@21n/components/flux/resourceStores/resource.utils";
  import UserLayout from "@21n/layout/layers/UserLayout.svelte";
  import { compareVersions } from "@21n/shared-utils/utils";
  import { UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { RxDBPersistence } from "@21n/persistence/rxdb/rxdb.local";
  import { DexiePersistence } from "@21n/persistence/dexie/dexie.local";
  import { parse } from "@21n/shared-utils/json.utils";
  import { resolveProductConfig } from "@21n/products/product.config";
  import { resourceStores } from "@21n/components/flux/resourceStores/resource.store";
  import { kvStores } from "@21n/components/flux/resourceStores/kv.store";
  const loadingMessages = {
    cloneUp: {
      message: "Syncing your local data with the cloud...",
      subMessage: "This might take a while."
    },
    syncDown: {
      message: "Syncing your data from cloud..."
    },
    cloneDown: {
      message: "First login detected. Syncing your data..."
    }
  };

  const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

  let loadingMessage: {
    message: string;
    subMessage?: string;
    duration?: number;
    percentage?: number;
  } = {
    message: ""
  };
  let isAppLoading = false;
  let error: string | null = null;
  let dev_isDisableSyncOnAppear = false;
  let subs: any[] = [];
  const isDebug = import.meta.env?.DEV;
  $: searcheableResources =
    resolveProductResources($appStore.product, "search") ?? [];

  async function shouldRunFluxIndex() {
    const lastIndexedAt = await clientStorage.get(
      ClientStorageKey.LAST_INDEXED_AT
    );
    if (!lastIndexedAt) return true;

    const lastIndexedTimestamp = Number(lastIndexedAt);
    if (Number.isNaN(lastIndexedTimestamp)) return true;

    return Date.now() - lastIndexedTimestamp >= ONE_WEEK_IN_MS;
  }

  async function runFluxIndexWithTracking() {
    await flux.index();
    await clientStorage.set(
      ClientStorageKey.LAST_INDEXED_AT,
      Date.now().toString()
    );
  }

  onMount(async () => {
    postMessageToParent(EmbedMessage.MOUNT);
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
    if (initState === 1) {
      $appLoadingState.isBaseLoaded = true;
      dispatch("ready");
    }
    let userDataState: any;
    if (initState !== undefined)
      userDataState = await initializeEssentialUserData(initState);
    if (userDataState?.paginateResources) {
      // loadingMessage.duration = userDataState.paginateResources.length * 2;
      //TODO - calculate estimated time to paginate using total length of records for each resource and resource type
      await flux.paginateResources(
        userDataState.paginateResources,
        100,
        userDataState.isFirstInitialLoad
      );
    } else if (userDataState?.cursors) {
      await flux.paginateResourcesV2(
        userDataState.cursors,
        userDataState.isFirstInitialLoad
      );
    }
    const shouldTriggerIndex = await shouldRunFluxIndex();
    const initializationTasks = [
      recentsStore.refresh(searcheableResources),
      initializeUserConfig()
    ];
    if (shouldTriggerIndex) {
      initializationTasks.push(runFluxIndexWithTracking());
    }
    await Promise.all(initializationTasks);
    if (initState !== 1) {
      $appLoadingState.isBaseLoaded = true;
      dispatch("ready");
    }
    console.timeEnd("init");

    safeRequestIdleCallback(async () => {
      if (userDataState?.counts && !isDebug) {
        await flux.reconcile({ counts: userDataState.counts });
        dispatchCustomEvent(GlobalEvent.SYNC_DOWN);
      }
      await recentsStore.refresh(searcheableResources);
      await syncAccountPaidPlanFromExternalProvider();
    });
  });

  function refreshUIStateDerived() {
    const interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      scope: UIStateScope.PRODUCT
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
    if (!$tzStore || (Array.isArray($tzStore) && $tzStore.length === 0)) {
      userPreferences.setTimeZone();
    }
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
      await flux.reinitializeIfRequired();
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
    const comparer = compareVersions(latestVersion, versionOnClient);
    if (latestVersion && comparer > 0) {
      if ($context.isEmbed) {
        confirmationNotification.notify({
          title: `App update available (v${latestVersion}) 🎉`,
          message: "Please update the app to continue.",
          type: AlertType.INFO,
          confirmAction: {
            label: "Update",
            callback: async () => {
              if (
                $context.os === OperatingSystem.IOS ||
                $context.os === OperatingSystem.MACOS
              ) {
                return appStore.openLink(
                  $appStore.appData?.urls?.appStore ??
                    $appStore.appData?.urls?.docs ??
                    ""
                );
              } else if ($context.os === OperatingSystem.WINDOWS) {
                return appStore.openLink(
                  $appStore.appData?.urls?.microsoftStore ?? ""
                );
              } else if ($context.os === OperatingSystem.ANDROID) {
                return appStore.openLink(
                  $appStore.appData?.urls?.playStore ?? ""
                );
              }
            }
          }
        });
      } else {
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
    logger.log({
      at: "performAppUpdateCheck",
      versionOnClient,
      latestVersion,
      comparer
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
      if (!isLiteMode && !isDebug && !$context.isInOfflineMode) {
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
        if (initState === 0) await kvSeedDelegate();
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

  async function kvSeedDelegate() {
    const data = Array.from(kvStores.values()).map((x) => {
      return { id: `kv:${x.id}`, ...x.seed };
    });
    await flux.kvSeed(data);
    await flux.loadInMemoryStores();
  }

  async function initializeFlux(params: { dapId: string; userId?: string }) {
    const tables = resolveProductConfig().tableConfig;
    const allStores = [...resourceStores.values(), ...kvStores.values()];
    const loaderCallback = (resource: string, data: any) => {
      const store = allStores.find(
        (s) => s.id === resource || `kv:${s.id}` === resource
      );
      if (store?.loader) {
        store.loader(data);
      }
    };

    const initParams = {
      ...params,
      appVersion: $appStore.version + "." + $appStore.build,
      product: $appStore.product,
      tables,
      loaderCallback
    };

    const provider: PersistenceProvider = PersistenceProvider.DEXIE;
    return initFlux(resolveLocalPersistence(), initParams);

    function resolveLocalPersistence() {
      switch (provider) {
        case PersistenceProvider.SURREAL:
          return new SurrealPersistence();
        case PersistenceProvider.SIGNALDB:
          return new SignalDBPersistence();
        case PersistenceProvider.RXDB:
          return new RxDBPersistence();
        case PersistenceProvider.INDEXEDDB:
          return new IndexedDBPersistence();
        case PersistenceProvider.DEXIE:
          return new DexiePersistence();
        default:
          return new SurrealPersistence();
      }
    }
  }

  async function initializeEssentialUserData(initState: number): Promise<
    | {
        paginateResources?: any;
        counts?: any;
      }
    | { cursors?: any }
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
        await kvSeedDelegate();
      }
    } else if ($account.sessionType === UserSessionType.RETURNING) {
      if (initState === 0) {
        loadingMessage = loadingMessages.cloneDown;
        const result = await flux.initializeEssentialDataForCloudUserV2();
        if (typeof result === "object" && result?.cursors) {
          return result;
        }
        // const result = await flux.initializeEssentialDataForCloudUser();
        // if (typeof result === "object" && result?.ifrCloneResult) {
        //   return result.ifrCloneResult;
        // }
      } else {
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
    console.timeEnd("initializeUserConfig");
    function setAnalyticsUserIdentity() {
      if (!$account.userInfo) return;
      posthog.identify($account.userInfo.id, {
        region: $account.userInfo.region
      });
    }
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
    if (detail.duration !== undefined) {
      loadingMessage.duration = detail.duration;
    }
    if (detail.percentage !== undefined) {
      loadingMessage.percentage = detail.percentage;
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
        const parsed = parse(event.data.payload);
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
          embedBridge.setData(parsed.id, parsed.type, parsed.data);
        } else if (parsed?.id && parsed?.data) {
          fileEmbedChannel.setFile(parsed.id, parsed.data);
        }
      }
    } catch (e) {
      logger.error({
        at: "handleMessageFromParent",
        error: e,
        eventType: event?.data?.type,
        origin: event?.origin
      });
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
<div class="flex w-screen h-screen">
  {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded || isAppLoading}
    <AppLoadingView
      message={loadingMessage.message}
      subMessage={loadingMessage.subMessage}
      duration={loadingMessage.duration}
      percentage={loadingMessage.percentage}
    />
  {:else if error}
    <PageError />
  {:else}
    <UserLayout>
      <slot slot="topnav" name="topnav" />
      <slot />
    </UserLayout>
  {/if}
</div>
{#if $appStore.isDebugMode}
  <DebugLayer />
{/if}
{#if $appLoadingState.isBaseLoaded}
  <DynamicMetadataLayer
    metadata={{
      title: $appStore?.appData?.name ?? $appStore?.product,
      ...$appStore?.appData?.meta
    }}
  />
  <ModalLayer />
  <ShortcutRunner />
  <SyncLayer />
  {#if $appLoadingState.isLocalLoaded}
    <InMemoryCache />
  {/if}
{/if}
<Intercom />

<svelte:window
  on:focus={onAppear}
  on:beforeunload={handleBeforeUnload}
  on:unload={handleBeforeUnload}
/>

<svelte:document on:visibilitychange={visibilityChangeListener} />
