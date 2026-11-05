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
    rankNavigatorHistoryFrom,
    type RankedNavigatorHistoryEntry
  } from "@nucleum/shell/navigator/navigator-history";

  type NavigatorHistoryItem = {
    id: string;
    pageAction?: IAction;
  };

  const FREQUENT_LIMIT = 10;
  const FROM_HERE_LIMIT = 5;

  const currentPageId = $derived($page.url.searchParams.get(AccessMode.PAGE));
  const frequentItems = $derived(
    resolveHistoryItems(
      rankNavigatorHistory($navigatorHistory, Date.now()),
      FREQUENT_LIMIT
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

<div class="flex flex-col h-full w-full gap-2">
  <div
    class="w-full h--10 pt-3 flex items-center justify-between border--b border-brs3"
  >
    <div class="px-3 flex items-center gap-2 flex-1">
      <TextInput placeholder="Search..." size={Size.sm} />
    </div>
  </div>
  <div class="grid grid-rows-2 grow w-full">
    <div class="flex flex-col gap-2 w-full truncate">
      <div class="text-b2 text-fgs3 w-full bg-bgs2 px-3">Currently opened</div>
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
      class="flex flex-col gap-2 px-3 border-t border-brs3 py-1 overflow-y-auto"
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
    </div>
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
    left: 0;
    height: 50%;
    width: 100%;
    z-index: 0;
    opacity: 0.7;
    border-bottom: 1px dashed rgb(var(--colors-fgs4));
  }
</style>
