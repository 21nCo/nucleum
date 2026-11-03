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
    rankNavigatorHistory,
    rankNavigatorHistoryByRecency,
    rankNavigatorHistoryFrom,
    type RankedNavigatorHistoryEntry
  } from "@nucleum/shell/navigator/navigator-history";
  import { onDestroy, onMount } from "svelte";
  import { datafn, datafnRuntime } from "@nucleum/datafn/datafn.store";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";
  import { Action } from "@nucleum/client/config/action.enum";
  import { accessTrail } from "@nucleum/shell/navigator/access-trail.store";
  import {
    flattenAccessTrail,
    type AccessTrail
  } from "@nucleum/shell/navigator/access-trail";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { cn } from "@21n/ui/environment/presentation";

  type NavigatorHistoryItem = {
    id: string;
    pageAction?: IAction;
  };

  const FREQUENT_LIMIT = 10;
  const FROM_HERE_LIMIT = 5;
  const RECENT_LIMIT = 10;
  const SEARCH_LIMIT = 30;
  const SEARCH_DEBOUNCE_MS = 200;

  const searchResources = requireProductConfig().navigatorResources ?? [];
  let searchInputRef = $state<TextInput | undefined>(undefined);
  let query = $state("");
  let searchResults = $state<string[]>([]);
  let searchResultsQuery = $state("");
  let isSearching = $state(false);
  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  let searchRequestId = 0;
  const isSearchMode = $derived(query.trim().length > 0);
  const currentTrail = $derived($accessTrail.current);
  const currentTrailRows = $derived(
    currentTrail ? flattenAccessTrail(currentTrail) : []
  );
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
    setTimeout(() => searchInputRef?.focus(), 50);
  });

  onDestroy(() => clearTimeout(searchDebounce));

  async function search(value: string) {
    const trimmed = value.trim();
    const requestId = ++searchRequestId;
    if (!trimmed || searchResources.length === 0) {
      searchResults = [];
      searchResultsQuery = trimmed;
      isSearching = false;
      return;
    }
    isSearching = true;
    try {
      const result = (await datafn.search({
        query: trimmed,
        resources: searchResources,
        limit: SEARCH_LIMIT,
        limitPerResource: SEARCH_LIMIT,
        source: $datafnRuntime?.mode === "sync-direct" ? "remote" : "local",
        prefix: true,
        fuzzy: 0.2
      } as any)) as { results?: { data?: { id?: unknown } }[] };
      if (requestId !== searchRequestId) return;
      searchResultsQuery = trimmed;
      searchResults = (result.results ?? [])
        .map((entry) => entry.data?.id?.toString())
        .filter((id): id is string => !!id && isRecordId(id));
    } catch (error) {
      logger.error({ at: "Navigator.search", error });
      if (requestId === searchRequestId) {
        searchResults = [];
        searchResultsQuery = trimmed;
      }
    } finally {
      if (requestId === searchRequestId) isSearching = false;
    }
  }

  function clearSearch() {
    clearTimeout(searchDebounce);
    searchRequestId += 1;
    query = "";
    searchResults = [];
    searchResultsQuery = "";
    isSearching = false;
  }

  function handleSearchInput() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
  }

  function handleSearchKeydown(keydown: CustomEvent<KeyboardEvent>) {
    const event = keydown.detail;
    if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        clearSearch();
        return;
      }
      navigation.toggleSearchParam([AccessMode.PANEL]);
      return;
    }
    const target = resolveNavigatorSearchTarget(query, {
      query: searchResultsQuery,
      ids: searchResults
    });
    if (event.key === "Enter" && target) {
      event.preventDefault();
      openFresh(target);
    }
  }

  function openFresh(id: string) {
    navigation.openResource(id, AccessMode.PAGE, {
      origin: Action.NAVIGATOR,
      trail: "start"
    });
  }

  function handleHistoryClick(item: NavigatorHistoryItem) {
    if (item.pageAction) {
      navigation.gotoPath("/" + item.id);
      return;
    }
    openFresh(item.id);
  }

  function toggleTrail(key: string) {
    expandedTrails = expandedTrails.includes(key)
      ? expandedTrails.filter((item) => item !== key)
      : [...expandedTrails, key];
  }

  function resolveTrailLength(trail: AccessTrail) {
    return trail.nodes.length;
  }
</script>

{#snippet historyList(items: NavigatorHistoryItem[])}
  <div class="flex flex-col gap-1 -ml-2">
    {#each items as item (item.id)}
      <TopBarResourceItem
        item={item.pageAction?.action ?? item.id}
        isInterimTab={true}
        isTrail
        onClick={() => handleHistoryClick(item)}
      />
    {/each}
  </div>
{/snippet}

{#snippet resultList(ids: string[])}
  <div class="flex flex-col gap-1 -ml-2">
    {#each ids as id (id)}
      <TopBarResourceItem
        item={id}
        isInterimTab={true}
        isTrail
        onClick={() => openFresh(id)}
      />
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
          onClick={() => onSelect(row.index)}
        />
      </div>
    {/each}
  </div>
{/snippet}

<div class="flex flex-col h-full w-full min-h-0" data-testid="navigator">
  <div class="w-full shrink-0 pt-3 pb-2 px-3 flex items-center">
    <div class="flex-1">
      <TextInput
        bind:this={searchInputRef}
        bind:value={query}
        placeholder="Search..."
        size={Size.sm}
        testId="navigator-search-input"
        onInput={handleSearchInput}
        onKeydown={handleSearchKeydown}
      />
    </div>
  </div>
  <div class="flex flex-col flex-1 min-h-0 w-full overflow-y-auto">
    {#if isSearchMode}
      <section
        class="flex flex-col gap-2 px-3 py-2 shrink-0"
        data-testid="navigator-search-results"
      >
        <div class="text-b2 text-fgs3">Results</div>
        {#if searchResults.length > 0}
          {@render resultList(searchResults)}
        {:else if isSearching}
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
        {#if currentTrail && currentTrailRows.length > 0}
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
                      onClick={() => navigation.resumeTrail(trail.key, 0)}
                    />
                  </div>
                  {#if resolveTrailLength(trail) > 1}
                    <button
                      type="button"
                      class="flex items-center gap-1 h-6 px-1.5 rounded-md text-b3 text-fgs3 hover:bg-bgs3 hover:text-fgs2 shrink-0"
                      aria-expanded={isExpanded}
                      aria-label={`${resolveTrailLength(trail)} items in trail`}
                      onclick={() => toggleTrail(trail.key)}
                    >
                      {resolveTrailLength(trail)}
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
