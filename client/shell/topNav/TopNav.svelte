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
  import view from "@21n/ui/environment/view.store";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { tooltip } from "@21n/ui/actions/popover.action";
  import TopNavLeftMenuItem from "@nucleum/shell/topNav/TopNavLeftMenuItem.svelte";
  import TopNavDateTime from "@nucleum/shell/topNav/TopNavDateTime.svelte";
  import TopNavToasts from "@nucleum/shell/topNav/TopNavToasts.svelte";
  import TopBarCloseButton from "@nucleum/shell/topNav/TopBarCloseButton.svelte";
  import NavigatorPill from "@nucleum/shell/topNav/NavigatorPill.svelte";
  import PanelActionGroup from "@nucleum/shell/topNav/PanelActionGroup.svelte";
  import type {
    TopNavPanelAction,
    TopNavPanelActionState
  } from "@nucleum/shell/topNav/panel-actions";
  import TrailLeftIndicator from "@nucleum/shell/topNav/TrailLeftIndicator.svelte";
  import InlineSyncingFeedback from "@nucleum/shell/sync/InlineSyncingFeedback.svelte";
  import {
    ContextZoneLayer,
    contextZone
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  import { resolveContextZoneSubject } from "@nucleum/shell/topNav/contextZone/context-zone-subject";
  import PageIdentity from "@nucleum/shell/topNav/contextZone/PageIdentity.svelte";
  import PaneSwitchButton from "@nucleum/shell/topNav/contextZone/PaneSwitchButton.svelte";
  import { samplePageBackground } from "@nucleum/shell/topNav/contextZone/surface-background";
  import {
    closeTopLayer,
    resolveCloseControlLabel
  } from "@nucleum/shell/navigation/top-layer";
  import { isHomeRoute } from "@nucleum/shell/navigation/layout-route";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
  import { resolveAccessTrailBack } from "@nucleum/shell/navigator/access-trail";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";

  let {
    topnav = undefined,
    indicators = undefined,
    leftLogo = undefined,
    bulkEditBar = undefined,
    offlineStatus = undefined,
    panelActions = []
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
    /**
     * Product quick actions that open in the right panel, such as Focus;
     * grouped with Rhombus and the navigator.
     */
    panelActions?: TopNavPanelAction[];
  } = $props();

  const isDev = import.meta.env.DEV;
  const productConfig = requireProductConfig();
  const bulkEditCount = bulkEditStore.count;
  const bulkEditContext = bulkEditStore.context;
  const bulkEditSubContext = bulkEditStore.subContext;
  const activeEntry = contextZone.active;
  const activePane = contextZone.pane;
  const visiblePanes = contextZone.visiblePanes;

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
  const closeLabel = $derived(
    resolveCloseControlLabel(searchParams, $bulkEditCount)
  );
  const isPageOpen = $derived(!!searchParams.get(AccessMode.PAGE));
  const trailBack = $derived(
    resolveAccessTrailBack(
      $accessTrail.current,
      searchParams.get(AccessMode.PAGE)
    )
  );
  const subject = $derived(resolveContextZoneSubject($activePane, $page.url));
  const otherPanes = $derived(
    isBulkMode
      ? []
      : $visiblePanes
          .filter((pane) => pane.id !== $activePane?.id)
          .map((pane) => ({
            pane,
            subject: resolveContextZoneSubject(pane, $page.url)
          }))
          .filter((item) => !!item.subject)
  );
  const panesBefore = $derived(
    otherPanes.filter(
      (item) => item.pane.layer < ($activePane?.layer ?? Infinity)
    )
  );
  const panesAfter = $derived(
    otherPanes.filter(
      (item) => item.pane.layer >= ($activePane?.layer ?? Infinity)
    )
  );
  const subjectBack = $derived(
    subject?.kind === "resource" && subject.accessMode === AccessMode.PAGE
      ? trailBack
      : undefined
  );
  const isPageFullScreen = $derived(
    isPageOpen && !!searchParams.get(AppSearchParam.MAX)
  );
  const isHomePage = $derived(isHomeRoute($page.url));
  const openPanel = $derived(searchParams.get(AccessMode.PANEL));
  const isPanelBeside = $derived(
    !$view.isPortrait && !$view.isConstrainedWidth
  );
  const groupedPanelActions = $derived<TopNavPanelAction[]>([
    ...panelActions,
    ...(isDev ? [{ action: Action.RHOMBUS, content: rhombusAction }] : []),
    { action: Action.NAVIGATOR, content: navigatorAction }
  ]);
  const isToastMode = $derived($toasts.length > 0);
  const isAppMenuColumnVisible = $derived(
    !isPageFullScreen &&
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

  let barRef = $state<HTMLDivElement | undefined>(undefined);
  let tabRef = $state<HTMLDivElement | undefined>(undefined);
  let tabBackground = $state<string | undefined>(undefined);
  let sampleTimer: ReturnType<typeof setTimeout> | undefined;
  const isContextTab = $derived(isBulkMode || !!subject || !!$activeEntry);

  function sampleTabBackground() {
    if (!tabRef || !barRef) return;
    const bar = barRef.getBoundingClientRect();
    const paneId =
      $activePane?.layer === ContextZoneLayer.BESIDE_BASE ||
      $activePane?.layer === ContextZoneLayer.BESIDE_PAGE
        ? $activePane.id
        : undefined;
    const pane = paneId
      ? document.querySelector(
          `[data-context-zone-pane="${CSS.escape(paneId)}"] > *`
        )
      : null;
    const left = Math.max(
      tabRef.getBoundingClientRect().left,
      pane?.getBoundingClientRect().left ?? 0
    );
    tabBackground = samplePageBackground(
      { x: left + 4, y: bar.bottom + 4 },
      barRef
    );
  }

  function scheduleTabBackground() {
    clearTimeout(sampleTimer);
    requestAnimationFrame(sampleTabBackground);
    sampleTimer = setTimeout(sampleTabBackground, 400);
  }

  $effect(() => {
    void $page.url.href;
    void $activePane;
    void tabRef;
    scheduleTabBackground();
  });

  onMount(() => {
    const themeObserver = new MutationObserver(scheduleTabBackground);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    });
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    colorScheme.addEventListener("change", scheduleTabBackground);
    window.addEventListener("resize", scheduleTabBackground);
    return () => {
      clearTimeout(sampleTimer);
      themeObserver.disconnect();
      colorScheme.removeEventListener("change", scheduleTabBackground);
      window.removeEventListener("resize", scheduleTabBackground);
    };
  });

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

{#snippet rhombusAction(state: TopNavPanelActionState)}
  <TopNavLeftMenuItem
    action={Action.RHOMBUS}
    label={state === "expanded" ? "Rhombus" : undefined}
    tooltip="Rhombus on the side"
    ariaLabel="Rhombus"
    isExpanded={state === "expanded"}
  />
{/snippet}

{#snippet navigatorAction(state: TopNavPanelActionState)}
  <NavigatorPill {state} />
{/snippet}

<div class="hidden otopl:!block w-full min-h-6 h-6 bg-bgs2"></div>
<div
  bind:this={barRef}
  class={cn(
    "flex shrink-0 items-center w-full h-12 min-h-12 max-h-12 bg-bgs2 userdata",
    {
      "border-b border-brs3": !$context.experiments?.isEnableRoundedMain
    }
  )}
  data-testid="top-bar"
>
  {#if $context.embed !== Embed.HANDSET}
    {#if isCloseMode}
      <TopBarCloseButton
        label={closeLabel}
        menuColumn={isAppMenuColumnVisible
          ? isHideMenuLabels
            ? "icons"
            : "labels"
          : undefined}
        onclick={() =>
          closeTopLayer({ isIncludePanel: false, isIncludeFullScreen: false })}
      />
    {:else}
      {@render leftLogo?.()}
    {/if}
  {/if}
  <div
    class="flex flex-1 min-w-0 self-stretch items-stretch"
    data-testid="top-bar-context-zone"
  >
    {#each panesBefore as item (item.pane.id)}
      <PaneSwitchButton
        subject={item.subject!}
        onFocus={() => contextZone.activatePane(item.pane.id)}
      />
    {/each}
    {#if isContextTab}
      <div
        bind:this={tabRef}
        class={cn(
          "relative z-10 flex min-w-0 shrink h-[calc(100%+1px)] -mb-px border-r border-b border-brs3",
          { "bg-bgs1": !tabBackground }
        )}
        style:background-color={tabBackground}
        data-testid="top-bar-context-tab"
      >
        <div
          class="flex items-center h-full min-w-0 overflow-x-auto overflow-y-hidden"
        >
          {#if isPageFullScreen && !isBulkMode}
            <div class="flex items-center h-full shrink-0 pl-1">
              <button
                type="button"
                data-testid="top-bar-exit-full-screen"
                aria-label="Exit full screen"
                class="flex items-center justify-center h-8 w-8 rounded-md text-fgs2 hover:bg-bgs3 hover:text-fgs1"
                use:tooltip={{ text: "Exit full screen" }}
                onclick={() => navigation.exitFullScreen()}
              >
                <Icon icon="exitfullscreen" size={Size.md} />
              </button>
            </div>
          {/if}
          {#if subject && !isBulkMode}
            <PageIdentity
              {subject}
              backId={subjectBack?.id}
              onBack={() => navigation.backInTrail()}
            />
            {#if $activeEntry}
              <div
                class="shrink-0 w-px h-5 mx-1 bg-brs3"
                aria-hidden="true"
                data-testid="top-bar-identity-divider"
              ></div>
            {/if}
          {/if}
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
      </div>
    {/if}
    {#each panesAfter as item (item.pane.id)}
      <PaneSwitchButton
        subject={item.subject!}
        onFocus={() => contextZone.activatePane(item.pane.id)}
      />
    {/each}
  </div>
  <div
    class="flex items-center justify-end h-full shrink-0 border-l border-brs3"
    data-testid="top-bar-actions-zone"
  >
    {#if isToastMode}
      <TopNavToasts />
    {:else}
      {@render topnav?.()}
      <TopNavLeftMenuItem action={Action.CMD} ariaLabel="Command bar" />
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
  <PanelActionGroup actions={groupedPanelActions} {openPanel} {isPanelBeside} />
</div>
