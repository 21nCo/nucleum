<svelte:options runes={true} />

<script lang="ts">
  import { navigation } from "@nucleum/shell/navigation/navigation";

  import { vTrail } from "../topNav/tabs/tabs.store";
  import TopBarResourceItem from "../topNav/tabs/TopBarResourceItem.svelte";
  import type { IRecordId } from "@nucleum/schema/legacy/data.type";
  import { isRecordId } from "@nucleum/datafn/resource.utils";
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
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { requireProductConfig } from "@nucleum/shared-state/product/product-config-host";

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
  let isSearching = $state(false);
  let searchDebounce: ReturnType<typeof setTimeout> | undefined;
  let searchRequestId = 0;
  const isSearchMode = $derived(query.trim().length > 0);

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
        source: "local",
        prefix: true,
        fuzzy: 0.2
      } as any)) as { results?: { data?: { id?: unknown } }[] };
      if (requestId !== searchRequestId) return;
      searchResults = (result.results ?? [])
        .map((entry) => entry.data?.id?.toString())
        .filter((id): id is string => !!id && isRecordId(id));
    } catch (error) {
      logger.error({ at: "Navigator.search", error });
      if (requestId === searchRequestId) searchResults = [];
    } finally {
      if (requestId === searchRequestId) isSearching = false;
    }
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
        query = "";
        searchResults = [];
        return;
      }
      navigation.toggleSearchParam([AccessMode.PANEL]);
      return;
    }
    if (event.key === "Enter" && searchResults[0]) {
      event.preventDefault();
      navigation.openResource(searchResults[0], AccessMode.PAGE);
    }
  }

  function handleClick(item: IRecordId) {
    navigation.activateVerticalTrail(item);
  }

  function handleHistoryClick(item: NavigatorHistoryItem) {
    if (item.pageAction) {
      navigation.gotoPath("/" + item.id);
      return;
    }
    navigation.openResource(item.id, AccessMode.PAGE);
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
        onClick={() => navigation.openResource(id, AccessMode.PAGE)}
      />
    {/each}
  </div>
{/snippet}

<div class="flex flex-col h-full w-full gap-2" data-testid="navigator">
  <div class="w-full pt-3 px-3 flex items-center">
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
  {#if isSearchMode}
    <div
      class="flex flex-col gap-2 px-3 py-1 overflow-y-auto grow"
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
    </div>
  {:else}
    <div class="flex flex-col grow w-full overflow-y-auto">
      <div class="flex flex-col gap-2 w-full truncate pb-2">
        <div class="text-b2 text-fgs3 w-full bg-bgs2 px-3">
          Currently opened
        </div>
        {#if $vTrail.items.length > 0 && $vTrail.base}
          <div class="pl-3 pr-2 trail relative flex flex-col gap-2">
            {#if isRecordId($vTrail.base) && $vTrail.base}
              <div class="-ml-2">
                <TopBarResourceItem
                  item={$vTrail.base}
                  isInterimTab={true}
                  onClick={() => {
                    if (!$vTrail.base) return;
                    handleClick($vTrail.base);
                  }}
                  isTrail
                />
              </div>
            {/if}
            {#each $vTrail.items as item (item)}
              {@const parts = item.split("-")}
              <div
                class="relative trail-item"
                style={`padding-left: ${parts.length * 5}px;`}
              >
                <TopBarResourceItem
                  item={parts[parts.length - 1]}
                  onClick={() => handleClick(item)}
                  isInterimTab={true}
                  isTrail
                  onClose={() => {
                    vTrail.remove(item);
                  }}
                />
              </div>
            {/each}
          </div>
        {:else}
          <EmptyStatusView size={Size.sm} mainText="No items opened" />
        {/if}
      </div>
      <div
        class="flex flex-col gap-2 px-3 border-t border-brs3 py-2"
        data-testid="navigator-recent"
      >
        <div class="text-b2 text-fgs3">Recently accessed</div>
        {#if recentItems.length > 0}
          {@render historyList(recentItems)}
        {:else}
          <EmptyStatusView size={Size.sm} mainText="No history yet" />
        {/if}
      </div>
      <div class="flex flex-col gap-2 px-3 border-t border-brs3 py-2">
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
      </div>
    </div>
  {/if}
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
    left: 0;
    height: 50%;
    width: 100%;
    z-index: 0;
    opacity: 0.7;
    border-bottom: 1px dashed rgb(var(--colors-fgs4));
  }
</style>
