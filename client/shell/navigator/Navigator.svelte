<svelte:options runes={true} />

<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import TopBarResourceItem from "../topNav/tabs/TopBarResourceItem.svelte";
  import { isRecordId } from "@nucleum/datafn/resource.utils";
  import { resolveNavigatorSearchTarget } from "@nucleum/shell/navigator/navigator-search";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import TextInput from "@21n/ui/elements/input/TextInput.svelte";
  import { page } from "$app/stores";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { navigatorHistory } from "@nucleum/shell/navigator/navigator-history.store";
  import {
    navigatorSearchBoost,
    rankNavigatorHistory,
    rankNavigatorHistoryByRecency,
    rankNavigatorHistoryFrom,
    type RankedNavigatorHistoryEntry
  } from "@nucleum/shell/navigator/navigator-history";
  import type { Snippet } from "svelte";
  import { onDestroy, onMount, untrack, tick } from "svelte";
  import { navigatorFocusRequests } from "@nucleum/shell/navigator/navigator-focus";
  import { resolveNavigatorLayer } from "@nucleum/shell/navigator/navigator-layer";
  import { get } from "svelte/store";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { searchResources } from "@nucleum/shared-state/resources/resource-search";
  import { Action } from "@nucleum/client/config/action.enum";
  import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
  import {
    flattenAccessTrail,
    type AccessTrail
  } from "@nucleum/shell/navigator/access-trail";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { cn } from "@21n/ui/environment/presentation";
  import { navigatorSearch } from "@nucleum/shell/navigator/navigator-search";
  import {
    NAVIGATOR_SECTION_LIMIT,
    formatNavigatorAge,
    limitSectionItems,
    resolveFrequentContext
  } from "@nucleum/shell/navigator/navigator-sections";
  import {
    liveResource,
    resolvePlainResourceLabel
  } from "@nucleum/shell/topNav/tabs/live-resource";
  import { tooltip } from "@21n/ui/actions/popover.action";

  type NavigatorHistoryItem = {
    id: string;
    pageAction?: IAction;
    /** Time of the last open. */
    at: number;
  };

  const FREQUENT_LIMIT = 10;
  const RECENT_LIMIT = 10;
  const SEARCH_LIMIT = 30;
  const SEARCH_DEBOUNCE_MS = 200;

  let searchInputRef = $state<TextInput | undefined>(undefined);
  const query = navigatorSearch.query;
  const isInlineSearch = navigatorSearch.isInline;
  let searchResults = $state<string[]>([]);
  let searchResultsQuery = $state("");
  const isSearchResultsCurrent = $derived(searchResultsQuery === $query.trim());
  let selectedIndex = $state(0);
  let resultElements = $state<HTMLElement[]>([]);
  let isSearching = $state(false);
  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  let searchRequestId = 0;
  let searchController: AbortController | undefined;
  const isSearchMode = $derived($query.trim().length > 0);
  const currentTrail = $derived($accessTrail.current);
  const recentTrails = $derived($accessTrail.recent);
  let expandedTrails = $state<string[]>([]);
  let expandedSections = $state<string[]>([]);

  const currentPageId = $derived($page.url.searchParams.get(AccessMode.PAGE));
  const frequentItems = $derived(
    resolveHistoryItems(
      rankNavigatorHistory($navigatorHistory, Date.now()),
      FREQUENT_LIMIT
    )
  );
  const recentItems = $derived(
    resolveHistoryItems(
      rankNavigatorHistoryByRecency($navigatorHistory),
      RECENT_LIMIT
    )
  );
  let clearedFrequentContext = $state<string | undefined>(undefined);
  let now = $state(Date.now());
  const fromHereItems = $derived(
    currentPageId && isRecordId(currentPageId)
      ? resolveHistoryItems(
          rankNavigatorHistoryFrom(
            $navigatorHistory,
            currentPageId,
            Date.now()
          ),
          FREQUENT_LIMIT
        )
      : []
  );

  const frequentContext = $derived(
    resolveFrequentContext(
      currentPageId,
      fromHereItems.length,
      clearedFrequentContext
    )
  );
  const frequentContextLive = $derived(
    frequentContext ? liveResource(frequentContext) : undefined
  );
  const frequentContextLabel = $derived(
    resolvePlainResourceLabel($frequentContextLive?.resource)
  );

  function resolvePageAction(path: string) {
    return $appStore.actions.find((action) =>
      action.subViewOf
        ? action.path === path
        : (action.path ?? action.action) === path
    );
  }

  function resolveHistoryItems(
    ranked: RankedNavigatorHistoryEntry[],
    limit: number
  ): NavigatorHistoryItem[] {
    return ranked
      .map(({ id, entry }) =>
        entry.kind === "page"
          ? { id, pageAction: resolvePageAction(id), at: entry.lastOpenedAt }
          : { id, at: entry.lastOpenedAt }
      )
      .filter((item) => item.pageAction || isRecordId(item.id))
      .slice(0, limit);
  }

  onMount(() => {
    const clock = setInterval(() => (now = Date.now()), 60 * 1000);
    return () => clearInterval(clock);
  });

  onMount(() => {
    if (!$isInlineSearch) setTimeout(() => searchInputRef?.focus(), 50);
    return navigatorSearch.handleKeys(handleSearchKey);
  });

  $effect(() => {
    if ($navigatorFocusRequests === 0) return;
    untrack(() => {
      if (!$isInlineSearch) searchInputRef?.focus();
    });
  });

  onDestroy(() => {
    clearTimeout(searchDebounce);
    searchController?.abort();
    navigatorSearch.reset();
  });

  $effect(() => {
    const value = $query;
    untrack(() => scheduleSearch(value));
  });

  async function search(value: string) {
    const trimmed = value.trim();
    const requestId = ++searchRequestId;
    searchController?.abort();
    searchController = undefined;
    if (!trimmed) {
      searchResults = [];
      searchResultsQuery = trimmed;
      selectedIndex = 0;
      isSearching = false;
      return;
    }
    isSearching = true;
    const controller = new AbortController();
    searchController = controller;
    try {
      const hits = await searchResources({
        query: trimmed,
        limit: SEARCH_LIMIT,
        boost: navigatorSearchBoost(get(navigatorHistory), Date.now()),
        signal: controller.signal
      });
      if (requestId !== searchRequestId) return;
      searchResultsQuery = trimmed;
      searchResults = hits.map((hit) => hit.id);
      selectedIndex = 0;
      expandedSections = expandedSections.filter((key) => key !== "results");
    } catch (error) {
      if (requestId !== searchRequestId) return;
      logger.error({ at: "Navigator.search", error });
      searchResults = [];
      searchResultsQuery = trimmed;
    } finally {
      if (requestId === searchRequestId) isSearching = false;
    }
  }

  function clearSearch() {
    clearTimeout(searchDebounce);
    searchRequestId += 1;
    searchController?.abort();
    searchController = undefined;
    navigatorSearch.reset();
    searchResults = [];
    searchResultsQuery = "";
    isSearching = false;
  }

  function scheduleSearch(value: string) {
    clearTimeout(searchDebounce);
    if (!value.trim()) {
      void search(value);
      return;
    }
    searchDebounce = setTimeout(() => search(value), SEARCH_DEBOUNCE_MS);
  }

  function handleSearchKey(event: KeyboardEvent): boolean {
    if (event.isComposing || event.keyCode === 229) return true;
    if (event.key === "Escape") {
      event.preventDefault();
      if ($query) clearSearch();
      else
        navigation.toggleSearchParam([
          resolveNavigatorLayer(new URL(window.location.href)) ??
            AccessMode.PANEL
        ]);
      return true;
    }
    if (
      (event.key === "ArrowDown" || event.key === "ArrowUp") &&
      searchResults.length > 0
    ) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      selectedIndex =
        (selectedIndex + step + searchResults.length) % searchResults.length;
      if (
        selectedIndex >= NAVIGATOR_SECTION_LIMIT &&
        !isSectionExpanded("results")
      )
        toggleSection("results");
      void revealSelectedResult();
      return true;
    }
    const target = resolveNavigatorSearchTarget(
      $query,
      { query: searchResultsQuery, ids: searchResults },
      selectedIndex
    );
    if (event.key === "Enter" && target) {
      event.preventDefault();
      event.stopPropagation();
      openFresh(target, event, true);
      return true;
    }
    return false;
  }

  async function revealSelectedResult() {
    await tick();
    resultElements[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }

  /**
   * Opens a resource as a fresh page that starts a trail; Cmd or Ctrl opens
   * it beside the base page, or beside the open page. Search results keep the
   * navigator open so the user can hop between them.
   */
  function openFresh(
    id: string,
    event?: MouseEvent | KeyboardEvent,
    isKeepNavigator = false
  ) {
    if (event && navigation.determineClickAccessMode(event)) {
      navigation.resourceClickHandler(event, id, {
        origin: Action.NAVIGATOR
      });
      return;
    }
    navigation.openResource(id, AccessMode.PAGE, {
      origin: Action.NAVIGATOR,
      trail: "start",
      isKeepNavigator
    });
  }

  function handleHistoryClick(
    item: NavigatorHistoryItem,
    event?: MouseEvent | KeyboardEvent
  ) {
    if (item.pageAction) {
      navigation.gotoPath("/" + item.id);
      return;
    }
    openFresh(item.id, event);
  }

  function isSectionExpanded(key: string) {
    return expandedSections.includes(key);
  }

  function toggleSection(key: string) {
    expandedSections = isSectionExpanded(key)
      ? expandedSections.filter((item) => item !== key)
      : [...expandedSections, key];
  }

  function toggleTrail(key: string) {
    expandedTrails = expandedTrails.includes(key)
      ? expandedTrails.filter((item) => item !== key)
      : [...expandedTrails, key];
  }
</script>

{#snippet band(label: string, action?: Snippet)}
  <div
    class="flex items-center justify-between gap-2 h-10 shrink-0 px-4 border-b border-brs3 bg-bgs3"
  >
    <span
      class="truncate text-b4 font-semibold uppercase tracking-wide text-fgs2"
      >{label}</span
    >
    {@render action?.()}
  </div>
{/snippet}

{#snippet historyList(items: NavigatorHistoryItem[], isShowAge = false)}
  <div class="flex flex-col gap-1 -ml-2">
    {#each items as item (item.id)}
      <div class="flex items-center gap-2 min-w-0">
        <div class="flex-1 min-w-0">
          <TopBarResourceItem
            item={item.pageAction?.action ?? item.id}
            isInterimTab={true}
            isTrail
            isTypeIcon
            onClick={(event) => handleHistoryClick(item, event)}
          />
        </div>
        {#if isShowAge && item.at > 0}
          <span
            class="shrink-0 text-b3 text-fgs3"
            data-testid="navigator-item-age"
            >{formatNavigatorAge(item.at, now)}</span
          >
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

{#snippet sectionToggle(key: string, hiddenCount: number)}
  {#if hiddenCount > 0 || isSectionExpanded(key)}
    <button
      type="button"
      class="self-start px-1.5 h-6 rounded-md text-b3 text-fgs3 hover:bg-bgs3 hover:text-fgs1"
      aria-expanded={isSectionExpanded(key)}
      data-testid="navigator-section-toggle"
      data-section={key}
      onclick={() => toggleSection(key)}
    >
      {isSectionExpanded(key) ? "Show less" : `Show ${hiddenCount} more`}
    </button>
  {/if}
{/snippet}

{#snippet limitedHistoryList(
  key: string,
  items: NavigatorHistoryItem[],
  isShowAge = false
)}
  {@const limited = limitSectionItems(items, isSectionExpanded(key))}
  {@render historyList(limited.visible, isShowAge)}
  {@render sectionToggle(key, limited.hiddenCount)}
{/snippet}

{#snippet resultList(ids: string[])}
  <div class="flex flex-col gap-1 -ml-2">
    {#each ids as id, index (id)}
      <div
        class={cn("rounded-md", {
          "ring-1 ring-brs4": index === selectedIndex
        })}
        bind:this={resultElements[index]}
        data-testid="navigator-search-result"
        data-active={index === selectedIndex}
      >
        <TopBarResourceItem
          item={id}
          isInterimTab={true}
          isTrail
          isTypeIcon
          onClick={(event) => openFresh(id, event, true)}
        />
      </div>
    {/each}
  </div>
{/snippet}

{#snippet trailTree(
  trail: AccessTrail,
  onSelect: (index: number) => void,
  activeIndex: number | undefined = undefined
)}
  <div class="trail relative flex flex-col gap-1 -ml-2">
    {#each flattenAccessTrail(trail) as row (row.index)}
      <div
        class={cn("relative flex items-center gap-2", {
          "trail-item": row.depth > 0
        })}
        style={`padding-left: ${row.depth * 14}px;`}
        data-testid="navigator-trail-item"
        data-trail-depth={row.depth}
        data-here={row.index === activeIndex ? "true" : undefined}
      >
        <div class="flex-1 min-w-0">
          <TopBarResourceItem
            item={row.id}
            isInterimTab={true}
            isTrail
            isTypeIcon
            onClick={() => onSelect(row.index)}
          />
        </div>
        {#if row.index === activeIndex}
          <span
            class="shrink-0 px-1.5 py-0.5 rounded-sm bg-aps1 text-b4 font-semibold text-abg"
            >here</span
          >
        {/if}
      </div>
    {/each}
  </div>
{/snippet}

<div class="flex flex-col h-full w-full min-h-0" data-testid="navigator">
  {#if !$isInlineSearch}
    <div class="w-full shrink-0 pt-3 pb-2 px-3 flex items-center">
      <div class="flex-1">
        <TextInput
          bind:this={searchInputRef}
          bind:value={$query}
          placeholder="Search or jump to..."
          size={Size.sm}
          testId="navigator-search-input"
          onKeydown={(keydown: CustomEvent<KeyboardEvent>) =>
            handleSearchKey(keydown.detail)}
        />
      </div>
    </div>
  {/if}
  <div class="flex flex-col flex-1 min-h-0 w-full overflow-y-auto">
    {#if isSearchMode}
      <section
        class="flex flex-col shrink-0"
        data-testid="navigator-search-results"
      >
        {@render band("Results")}
        <div class="flex flex-col gap-2 px-3 py-2">
          {#if isSearchResultsCurrent && searchResults.length > 0}
            {@const limited = limitSectionItems(
              searchResults,
              isSectionExpanded("results")
            )}
            {@render resultList(limited.visible)}
            {@render sectionToggle("results", limited.hiddenCount)}
          {:else if isSearching || !isSearchResultsCurrent}
            <div class="text-b3 text-fgs3">Searching...</div>
          {:else}
            <EmptyStatusView size={Size.sm} mainText="No results found" />
          {/if}
        </div>
      </section>
    {:else}
      {#if currentTrail}
        <section
          class="flex flex-col shrink-0"
          data-testid="navigator-current-trail"
        >
          {#snippet endTrail()}
            <button
              type="button"
              class="shrink-0 text-b3 font-medium text-aps1 hover:underline"
              data-testid="navigator-end-trail"
              onclick={() => accessTrail.end()}
            >
              End trail
            </button>
          {/snippet}
          {@render band(
            `Current trail \u00b7 ${currentTrailRows.length}`,
            endTrail
          )}
          <div class="flex flex-col px-3 py-2 border-b border-brs3">
            {@render trailTree(
              currentTrail,
              (index) => navigation.openTrailNode(index),
              currentPageId ? currentTrail.active : undefined
            )}
          </div>
        </section>
      {/if}
      <section class="flex flex-col shrink-0" data-testid="navigator-recent">
        {@render band("Recently accessed")}
        <div class="flex flex-col gap-2 px-3 py-2 border-b border-brs3">
          {#if recentItems.length > 0}
            {@render limitedHistoryList("recent", recentItems, true)}
          {:else}
            <EmptyStatusView size={Size.sm} mainText="No history yet" />
          {/if}
        </div>
      </section>
      <section class="flex flex-col shrink-0" data-testid="navigator-frequent">
        {#if frequentContext}
          {#snippet clearContext()}
            <button
              type="button"
              aria-label="Show frequently accessed everywhere"
              class="flex items-center justify-center h-6 w-6 shrink-0 rounded-md text-fgs3 hover:bg-bgs3 hover:text-fgs1"
              use:tooltip={{ text: "Clear context" }}
              onclick={() => (clearedFrequentContext = frequentContext)}
            >
              <Icon icon="cross" size={Size.xs} />
            </button>
          {/snippet}
          <div data-testid="navigator-frequent-context">
            {@render band(
              `Frequently accessed from ${frequentContextLabel}`,
              clearContext
            )}
          </div>
          <div class="flex flex-col gap-2 px-3 py-2 border-b border-brs3">
            {@render limitedHistoryList("frequent", fromHereItems)}
          </div>
        {:else}
          {@render band("Frequently accessed")}
          <div class="flex flex-col gap-2 px-3 py-2 border-b border-brs3">
            {#if frequentItems.length > 0}
              {@render limitedHistoryList("frequent", frequentItems)}
            {:else}
              <EmptyStatusView size={Size.sm} mainText="No history yet" />
            {/if}
          </div>
        {/if}
      </section>
      {#if recentTrails.length > 0}
        {@const limitedTrails = limitSectionItems(
          recentTrails,
          isSectionExpanded("trails")
        )}
        <section
          class="flex flex-col shrink-0"
          data-testid="navigator-recent-trails"
        >
          {@render band("Recent trails")}
          <div class="flex flex-col gap-1 px-3 py-2 border-b border-brs3">
            {#each limitedTrails.visible as trail (trail.key)}
              {@const isExpanded = expandedTrails.includes(trail.key)}
              <div
                class="flex flex-col gap-1"
                data-testid="navigator-recent-trail"
              >
                <div class="flex items-center gap-1 -ml-2">
                  <div class="flex-1 min-w-0">
                    <TopBarResourceItem
                      item={trail.nodes[0].id}
                      isInterimTab={true}
                      isTrail
                      isTypeIcon
                      onClick={() => navigation.resumeTrail(trail.key, 0)}
                    />
                  </div>
                  {#if trail.nodes.length > 1}
                    <button
                      type="button"
                      class="flex items-center gap-1 h-6 px-1.5 rounded-md text-b3 text-fgs3 hover:bg-bgs3 hover:text-fgs2 shrink-0"
                      aria-expanded={isExpanded}
                      aria-label={`${trail.nodes.length} items in trail`}
                      onclick={() => toggleTrail(trail.key)}
                    >
                      {trail.nodes.length}
                      <Icon
                        icon={isExpanded ? "chevron-up" : "chevron-down"}
                        size={Size.xs}
                      />
                    </button>
                  {/if}
                </div>
                {#if isExpanded}
                  <div class="pl-3">
                    {@render trailTree(trail, (index) =>
                      navigation.resumeTrail(trail.key, index)
                    )}
                  </div>
                {/if}
              </div>
            {/each}
            {@render sectionToggle("trails", limitedTrails.hiddenCount)}
          </div>
        </section>
      {/if}
    {/if}
  </div>
  <div
    class="flex items-center gap-4 shrink-0 px-4 py-2.5 border-t border-brs3 text-b3 text-fgs3"
    data-testid="navigator-key-hints"
  >
    <span class="flex items-center gap-1"
      ><kbd
        class="px-1.5 py-0.5 rounded-sm bg-bgs3 text-b4 font-semibold text-fgs2"
        >&#8629;</kbd
      > open</span
    >
    <span class="flex items-center gap-1"
      ><kbd
        class="px-1.5 py-0.5 rounded-sm bg-bgs3 text-b4 font-semibold text-fgs2"
        >&#8984;&#8629;</kbd
      > split</span
    >
    <span class="flex items-center gap-1"
      ><kbd
        class="px-1.5 py-0.5 rounded-sm bg-bgs3 text-b4 font-semibold text-fgs2"
        >&#8984;K</kbd
      > super bar</span
    >
  </div>
</div>

<style>
  .trail::before {
    content: "";
    position: absolute;
    top: 0;
    left: 10px;
    height: 100%;
    width: 0%;
    z-index: 0;
    opacity: 0.7;
    border-right: 1px dashed rgb(var(--colors-fgs4));
  }

  .trail-item::before {
    content: "";
    position: absolute;
    top: 0;
    left: 10px;
    height: 50%;
    width: calc(100% - 10px);
    z-index: 0;
    opacity: 0.7;
    border-bottom: 1px dashed rgb(var(--colors-fgs4));
  }
</style>
