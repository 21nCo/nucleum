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
  import { isToastBesideActions } from "@nucleum/shell/topNav/toast-placement";
  import { isContextTabShown } from "@nucleum/shell/topNav/context-tab";
  import {
    isTopNavPanelBeside,
    type TopNavPanelAction,
    type TopNavPanelActionState
  } from "@nucleum/shell/topNav/panel-actions";
  import TrailLeftIndicator from "@nucleum/shell/topNav/TrailLeftIndicator.svelte";
  import InlineSyncingFeedback from "@nucleum/shell/sync/InlineSyncingFeedback.svelte";
  import {
    DEFAULT_CONTEXT_ZONE_SURFACE,
    contextZone
  } from "@nucleum/shell/topNav/contextZone/context-zone";
  import {
    resolveContextZoneSubject,
    resolveSpaceBaseBack
  } from "@nucleum/shell/topNav/contextZone/context-zone-subject";
  import PageIdentity from "@nucleum/shell/topNav/contextZone/PageIdentity.svelte";
  import PaneSwitchButton from "@nucleum/shell/topNav/contextZone/PaneSwitchButton.svelte";
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
      ? resolveSpaceBaseBack($page.url, trailBack)
      : undefined
  );
  const isPageFullScreen = $derived(
    isPageOpen && !!searchParams.get(AppSearchParam.MAX)
  );
  const isHomePage = $derived(isHomeRoute($page.url));
  const openPanel = $derived(searchParams.get(AccessMode.PANEL));
  const isPanelBeside = $derived(isTopNavPanelBeside($view));
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

  const isContextTab = $derived(
    isContextTabShown({
      isBulkMode,
      hasSubject: !!subject,
      hasActiveEntry: !!$activeEntry,
      isHomePage
    })
  );
  const isContextTabLeading = $derived(
    isAppMenuColumnVisible && panesBefore.length === 0
  );
  let zoneRef = $state<HTMLDivElement | undefined>(undefined);
  let tabInnerRef = $state<HTMLDivElement | undefined>(undefined);
  let entryRef = $state<HTMLDivElement | undefined>(undefined);

  function measureEntryWidth() {
    if (!zoneRef || !tabInnerRef || !entryRef) {
      contextZone.setEntryWidth(undefined);
      return;
    }
    const others = [...zoneRef.children]
      .filter(
        (child) =>
          (child as HTMLElement).dataset.testid !== "top-bar-context-tab" &&
          !(child as HTMLElement).dataset.toastSlot
      )
      .reduce((total, child) => total + (child as HTMLElement).offsetWidth, 0);
    const identity = tabInnerRef.scrollWidth - entryRef.scrollWidth;
    contextZone.setEntryWidth(
      Math.max(0, Math.floor(zoneRef.clientWidth - others - identity - 1))
    );
  }

  $effect(() => {
    if (!zoneRef) return;
    const observer = new ResizeObserver(() => measureEntryWidth());
    observer.observe(zoneRef);
    if (tabInnerRef) observer.observe(tabInnerRef);
    if (entryRef) observer.observe(entryRef);
    measureEntryWidth();
    return () => observer.disconnect();
  });
  let isToastRoomy = $state(false);
  const isToastInZone = $derived(isToastMode && isToastRoomy);

  function measureToastRoom() {
    if (!zoneRef || isToastMode) return;
    const used = [...zoneRef.children].reduce((total, child) => {
      const element = child as HTMLElement;
      const inner =
        element.dataset.testid === "top-bar-context-tab"
          ? (element.firstElementChild as HTMLElement | null)
          : null;
      return total + (inner ? inner.scrollWidth + 1 : element.offsetWidth);
    }, 0);
    isToastRoomy = isToastBesideActions(zoneRef.clientWidth, used);
  }

  $effect(() => {
    if (!zoneRef) return;
    const observer = new ResizeObserver(measureToastRoom);
    observer.observe(zoneRef);
    if (tabInnerRef) observer.observe(tabInnerRef);
    return () => observer.disconnect();
  });

  $effect(() => {
    void $page.url.href;
    void $activeEntry;
    void isToastMode;
    requestAnimationFrame(measureToastRoom);
  });
  const tabSurface = $derived(
    (!isBulkMode && $activeEntry?.surface) || DEFAULT_CONTEXT_ZONE_SURFACE
  );

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

<div class="app-chrome hidden otopl:!block w-full min-h-6 h-6 bg-bgs2"></div>
<div
  class={cn(
    "app-chrome flex shrink-0 items-center w-full h-12 min-h-12 max-h-12 bg-bgs2 userdata border-b border-brs3",
    "app-framed:border-b-0 app-framed:h-[calc(3rem+2*var(--app-shell-gap))] app-framed:min-h-[calc(3rem+2*var(--app-shell-gap))] app-framed:max-h-[calc(3rem+2*var(--app-shell-gap))]"
  )}
  data-testid="top-bar"
  data-chrome-icons
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
    bind:this={zoneRef}
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
        class={cn(
          "app-content context-tab relative z-10 flex min-w-0 shrink h-[calc(100%+1px)] -mb-px border-r border-b border-brs3",
          "app-framed:self-end app-framed:h-[calc(100%-var(--app-shell-gap)+1px)] app-framed:-mb-px app-framed:border-0 app-framed:rounded-t-[var(--app-tab-radius)]",
          tabSurface
        )}
        data-testid="top-bar-context-tab"
        data-leading={isContextTabLeading ? "true" : undefined}
      >
        <div
          bind:this={tabInnerRef}
          class="flex items-center h-full min-w-0 overflow-x-auto overflow-y-hidden pl-2 pr-4"
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
              titleContent={$activeEntry?.title}
              onBack={() => navigation.backInTrail()}
            />
            {#if $activeEntry}
              <div
                class="shrink-0 w-px h-5 mx-3 bg-brs3 app-framed:bg-transparent"
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
              <div
                bind:this={entryRef}
                class="flex items-center h-full min-w-0"
              >
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
    {#if isToastInZone}
      <div
        class="flex items-center justify-end min-w-0 max-w-[32rem] ml-auto"
        data-toast-slot="true"
      >
        <TopNavToasts />
      </div>
    {/if}
  </div>
  <div
    class="flex items-center justify-end h-full shrink-0 app-framed:gap-2 app-framed:px-1"
    data-testid="top-bar-actions-zone"
  >
    {#if isToastMode && !isToastInZone}
      <TopNavToasts />
    {:else}
      {@render topnav?.()}
      <TopNavLeftMenuItem action={Action.CMD} ariaLabel="Command bar" />
    {/if}
  </div>
  <div
    class="flex items-center h-full shrink-0 [&>*]:mx-1"
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

<style>
  :global(:is([data-app-style="semi"], [data-app-style="rounded"]))
    .context-tab::after,
  :global(:is([data-app-style="semi"], [data-app-style="rounded"]))
    .context-tab:not([data-leading])::before {
    content: "";
    position: absolute;
    bottom: 0;
    width: calc(var(--app-tab-radius) + 1px);
    height: var(--app-tab-radius);
    background-color: inherit;
    pointer-events: none;
  }

  :global(:is([data-app-style="semi"], [data-app-style="rounded"]))
    .context-tab::after {
    right: calc(var(--app-tab-radius) * -1);
    -webkit-mask: radial-gradient(
      circle at 100% 0,
      transparent calc(var(--app-tab-radius) - 0.5px),
      #000 var(--app-tab-radius)
    );
    mask: radial-gradient(
      circle at 100% 0,
      transparent calc(var(--app-tab-radius) - 0.5px),
      #000 var(--app-tab-radius)
    );
  }

  :global(:is([data-app-style="semi"], [data-app-style="rounded"]))
    .context-tab:not([data-leading])::before {
    left: calc(var(--app-tab-radius) * -1);
    -webkit-mask: radial-gradient(
      circle at 0 0,
      transparent calc(var(--app-tab-radius) - 0.5px),
      #000 var(--app-tab-radius)
    );
    mask: radial-gradient(
      circle at 0 0,
      transparent calc(var(--app-tab-radius) - 0.5px),
      #000 var(--app-tab-radius)
    );
  }

  :global(
      :is([data-app-style="semi"], [data-app-style="rounded"])
        .shell-frame:has(.context-tab[data-leading])
        .shell-main
    ) {
    border-top-left-radius: 0;
  }
</style>
