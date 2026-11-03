<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { uiState } from "@nucleum/shared-state/preferences/ui-state/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@nucleum/shared-state/preferences/ui-state/uiState.type";
  import { Action } from "@nucleum/client/config/action.enum";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import context from "@nucleum/client/runtime/context.store";
  import { toasts } from "@nucleum/shared-state/notifications/notification.store";
  import { bulkEditStore } from "@nucleum/shared-state/resources/bulkedit.store";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { cn } from "@21n/ui/environment/presentation";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import TopNavLeftMenuItem from "@nucleum/shell/topNav/TopNavLeftMenuItem.svelte";
  import TopNavDateTime from "@nucleum/shell/topNav/TopNavDateTime.svelte";
  import TopNavToasts from "@nucleum/shell/topNav/TopNavToasts.svelte";
  import NavigatorPill from "@nucleum/shell/topNav/NavigatorPill.svelte";
  import TrailLeftIndicator from "@nucleum/shell/topNav/TrailLeftIndicator.svelte";
  import InlineSyncingFeedback from "@nucleum/shell/sync/InlineSyncingFeedback.svelte";
  import { contextZone } from "@nucleum/shell/topNav/contextZone/context-zone";
  import { closeTopLayer } from "@nucleum/shell/navigation/top-layer";
  import { isHomeRoute } from "@nucleum/shell/navigation/layout-route";

  let {
    topnav = undefined,
    indicators = undefined,
    leftLogo = undefined,
    bulkEditBar = undefined,
    offlineStatus = undefined
  }: {
    /** Quick actions rendered in the actions zone. */
    topnav?: Snippet;
    /** Persistent product indicators, such as a running focus session. */
    indicators?: Snippet;
    /** Brand slot rendered over the app menu column. */
    leftLogo?: Snippet;
    /** Bulk-edit toolbar slot rendered in the context zone during selection. */
    bulkEditBar?: Snippet<
      [
        params: {
          count: number;
          context: any;
          subContext?: string;
          onAction: (detail: { action: string; data?: any }) => void;
          onSelectAll: () => void;
          onClear: () => void;
        }
      ]
    >;
    /** Sync/offline status slot rendered with the persistent indicators. */
    offlineStatus?: Snippet<[{ isIconOnly?: boolean }]>;
  } = $props();

  const isDev = import.meta.env.DEV;
  const productConfig = requireProductConfig();
  const bulkEditCount = bulkEditStore.count;
  const bulkEditContext = bulkEditStore.context;
  const bulkEditSubContext = bulkEditStore.subContext;
  const activeEntry = contextZone.active;

  let isHideMenuLabels = $state(readHideMenuLabels());
  let isHideLeftNavBar = $state(readHideLeftNavBar());

  const searchParams = $derived($page.url.searchParams);
  const isBulkMode = $derived($bulkEditCount > 0 && !!$bulkEditContext);
  const isResourceOpen = $derived(
    !!searchParams.get(AccessMode.PAGE) ||
      !!searchParams.get(AccessMode.BESIDE_PAGE) ||
      !!searchParams.get(AccessMode.BESIDE_BASE)
  );
  const isCloseMode = $derived(isBulkMode || isResourceOpen);
  const isHomePage = $derived(isHomeRoute($page.url));
  const isToastMode = $derived($toasts.length > 0);
  const isAppMenuColumnVisible = $derived(
    !isHideLeftNavBar &&
      !$appStore.isMenuHidden &&
      productConfig.appMenu.length > 0
  );

  function readHideMenuLabels(): boolean {
    return !!uiState.getState(UIState.hideLeftNavMenuLabels, {
      scope: UIStateScope.DAP
    });
  }

  function readHideLeftNavBar(): boolean {
    return !!uiState.getState(UIState.isHideLeftNavBar);
  }

  onMount(() => {
    const release = contextZone.host();
    const unsubscribe = uiState.subscribe(() => {
      isHideMenuLabels = readHideMenuLabels();
      isHideLeftNavBar = readHideLeftNavBar();
    });
    return () => {
      release();
      unsubscribe();
    };
  });
</script>

<div class="hidden otopl:!block w-full min-h-6 h-6 bg-bgs2"></div>
<div
  class={cn("flex w-full h-12 max-h-12 min-h-11 bg-bgs2 userdata", {
    "border-b border-brs3": !$context.experiments?.isEnableRoundedMain
  })}
  data-testid="top-bar"
>
  {#if $context.embed !== Embed.HANDSET}
    {#if isCloseMode}
      <button
        type="button"
        data-testid="top-bar-close"
        aria-label={isBulkMode ? "Clear selection" : "Close"}
        class={cn(
          "flex items-center justify-center h-full shrink-0 text-fgs2 hover:bg-bgs3-striped hover:text-fgs1",
          {
            "border-r border-brs3": !$context.experiments?.isEnableRoundedMain,
            "w-[5.5rem]": isAppMenuColumnVisible && !isHideMenuLabels,
            "w-[3.5rem]": isAppMenuColumnVisible && isHideMenuLabels,
            "px-4": !isAppMenuColumnVisible
          }
        )}
        use:tooltip={{ text: isBulkMode ? "Clear selection" : "Close" }}
        onclick={() => closeTopLayer({ isIncludePanel: false })}
      >
        <Icon icon="cross" size={Size.md} />
      </button>
    {:else}
      {@render leftLogo?.()}
    {/if}
  {/if}
  <div
    class="flex flex-1 min-w-0 h-full items-center justify-start overflow-x-auto"
    data-testid="top-bar-context-zone"
  >
    {#if isBulkMode}
      {@render bulkEditBar?.({
        count: $bulkEditCount,
        context: $bulkEditContext,
        subContext: $bulkEditSubContext,
        onAction: (detail: { action: string; data?: any }) =>
          bulkEditStore.onAction(detail.action, detail.data),
        onSelectAll: () => bulkEditStore.onSelectAll(),
        onClear: () => bulkEditStore.reset()
      })}
    {:else if $activeEntry}
      {#key $activeEntry.key}
        <div class="flex items-center h-full min-w-0">
          {@render $activeEntry.content()}
        </div>
      {/key}
    {:else if isHomePage}
      <div class="pl-2 h-full">
        <TopNavDateTime />
      </div>
    {/if}
  </div>
  <div
    class="flex items-center justify-end h-full shrink-0"
    data-testid="top-bar-actions-zone"
  >
    {#if isToastMode}
      <TopNavToasts />
    {:else}
      {@render topnav?.()}
      <TopNavLeftMenuItem action={Action.CMD} ariaLabel="Command bar" />
      {#if isDev}
        <TopNavLeftMenuItem
          action={Action.RHOMBUS}
          label="Rhombus"
          tooltip="Rhombus on the side"
        />
      {/if}
    {/if}
  </div>
  <div
    class="flex items-center h-full shrink-0 px-1"
    data-testid="top-bar-indicators"
  >
    <TrailLeftIndicator />
    {@render offlineStatus?.({})}
    <InlineSyncingFeedback
      resource={Resource.everything}
      isShorter={true}
      text="Syncing..."
    />
    {@render indicators?.()}
  </div>
  <NavigatorPill />
</div>
