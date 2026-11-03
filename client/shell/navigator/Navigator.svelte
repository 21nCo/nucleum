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

  type NavigatorHistoryItem = {
    id: string;
    pageAction?: IAction;
  };

  const FREQUENT_LIMIT = 10;
  const FROM_HERE_LIMIT = 5;
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
  const fromHereItems = $derived(
    currentPageId && isRecordId(currentPageId)
      ? resolveHistoryItems(
          rankNavigatorHistoryFrom(
            $navigatorHistory,
            currentPageId,
            Date.now()
          ),
          FROM_HERE_LIMIT
        )
      : []
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
          ? { id, pageAction: resolvePageAction(id) }
          : { id }
      )
      .filter((item) => item.pageAction || isRecordId(item.id))
      .slice(0, limit);
  }

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
      openFresh(target, event);
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
   * it beside the base page, or beside the open page.
   */
  function openFresh(id: string, event?: MouseEvent | KeyboardEvent) {
    if (event && navigation.determineClickAccessMode(event)) {
      navigation.resourceClickHandler(event, id, {
        origin: Action.NAVIGATOR
      });
      return;
    }
    navigation.openResource(id, AccessMode.PAGE, {
      origin: Action.NAVIGATOR,
      trail: "start"
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

  function toggleTrail(key: string) {
    expandedTrails = expandedTrails.includes(key)
      ? expandedTrails.filter((item) => item !== key)
      : [...expandedTrails, key];
  }
</script>

{#snippet historyList(items: NavigatorHistoryItem[])}
  <div class="flex flex-col gap-1 -ml-2">
    {#each items as item (item.id)}
      <TopBarResourceItem
        item={item.pageAction?.action ?? item.id}
        isInterimTab={true}
        isTrail
        isTypeIcon
        onClick={(event) => handleHistoryClick(item, event)}
      />
    {/each}
  </div>
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
          onClick={(event) => openFresh(id, event)}
        />
      </div>
    {/each}
  </div>
{/snippet}

{#snippet trailTree(trail: AccessTrail, onSelect: (index: number) => void)}
  <div class="trail relative flex flex-col gap-1 -ml-2">
    {#each flattenAccessTrail(trail) as row (row.index)}
      <div
        class={cn("relative", { "trail-item": row.depth > 0 })}
        style={`padding-left: ${row.depth * 14}px;`}
        data-testid="navigator-trail-item"
        data-trail-depth={row.depth}
      >
        <TopBarResourceItem
          item={row.id}
          isInterimTab={true}
          isTrail
          isTypeIcon
          onClick={() => onSelect(row.index)}
        />
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
          placeholder="Search..."
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
        class="flex flex-col gap-2 px-3 py-2 shrink-0"
        data-testid="navigator-search-results"
      >
        <div class="text-b2 text-fgs3">Results</div>
        {#if isSearchResultsCurrent && searchResults.length > 0}
          {@render resultList(searchResults)}
        {:else if isSearching || !isSearchResultsCurrent}
          <div class="text-b3 text-fgs3">Searching...</div>
        {:else}
          <EmptyStatusView size={Size.sm} mainText="No results found" />
        {/if}
      </section>
    {:else}
      <section
        class="flex flex-col gap-2 px-3 py-2 shrink-0"
        data-testid="navigator-current-trail"
      >
        <div class="text-b2 text-fgs3">Currently opened</div>
        {#if currentTrail}
          {@render trailTree(currentTrail, (index) =>
            navigation.openTrailNode(index)
          )}
        {:else}
          <EmptyStatusView size={Size.sm} mainText="No items opened" />
        {/if}
      </section>
      {#if recentTrails.length > 0}
        <section
          class="flex flex-col gap-2 px-3 py-2 shrink-0 border-t border-brs3"
          data-testid="navigator-recent-trails"
        >
          <div class="text-b2 text-fgs3">Recent trails</div>
          <div class="flex flex-col gap-1">
            {#each recentTrails as trail (trail.key)}
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
          </div>
        </section>
      {/if}
      <section
        class="flex flex-col gap-2 px-3 py-2 shrink-0 border-t border-brs3"
        data-testid="navigator-recent"
      >
        <div class="text-b2 text-fgs3">Recently accessed</div>
        {#if recentItems.length > 0}
          {@render historyList(recentItems)}
        {:else}
          <EmptyStatusView size={Size.sm} mainText="No history yet" />
        {/if}
      </section>
      <section
        class="flex flex-col gap-2 px-3 py-2 shrink-0 border-t border-brs3"
      >
        {#if fromHereItems.length > 0}
          <div class="text-b2 text-fgs3">Frequently opened from here</div>
          {@render historyList(fromHereItems)}
        {/if}
        <div class="text-b2 text-fgs3">Frequently accessed</div>
        {#if frequentItems.length > 0}
          {@render historyList(frequentItems)}
        {:else}
          <EmptyStatusView size={Size.sm} mainText="No history yet" />
        {/if}
      </section>
    {/if}
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
