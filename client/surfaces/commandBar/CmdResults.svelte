<script lang="ts">
  import ShortcutText from "@21n/ui/elements/text/ShortcutText.svelte";
  import { requireCommandHost } from "@nucleum/shared-state/commands/command-host";

  import { onDestroy, tick } from "svelte";
  import { appStore } from "@nucleum/shared-state/app-context/app.store";
  import view from "@21n/ui/environment/view.store";
  import type { IAction } from "@nucleum/shared-state/commands/action.type";
  import { ActionType } from "@nucleum/client/config/action.type";
  import { Action } from "@nucleum/client/config/action.enum";

  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { properCase } from "@21n/shared-utils/text.utils";
  import CmdResultItem from "@nucleum/surfaces/commandBar/CmdResultItem.svelte";
  import ResultItem from "@nucleum/surfaces/commandBar/ResultItem.svelte";
  import SearchResultRow from "@nucleum/surfaces/commandBar/SearchResultRow.svelte";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import type { ICommandAction } from "@nucleum/surfaces/commandBar/cmd.type";
  import {
    buildSuperBarEntries,
    flattenContextActions,
    runContextAction,
    toSuperBarSearchHit,
    type SuperBarEntry,
    type SuperBarScope
  } from "@nucleum/surfaces/commandBar/super-bar";
  import {
    searchResources,
    type ResourceSearchHit
  } from "@nucleum/shared-state/resources/resource-search";
  import { contextActions } from "@nucleum/shell/topNav/contextZone/context-actions";
  import { navigation } from "@nucleum/shell/navigation/navigation";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";

  const SEARCH_DEBOUNCE_MS = 150;
  const SEARCH_LIMIT = 20;

  let {
    search = "",
    scope = "all",
    onClose = void 0,
    onSearchAction = void 0,
    selectedKind = $bindable()
  }: {
    search?: string;
    scope?: SuperBarScope;
    /** Kind of the selected row, so the bar can hint what Enter does. */
    selectedKind?: SuperBarEntry["kind"] | undefined;
    onClose?: () => void;
    onSearchAction?: (action: ICommandAction) => void;
  } = $props();

  const activeContextActions = contextActions.active;
  let selectedKey = $state<string | null>(null);
  let results = $state<ResourceSearchHit[]>([]);
  let resultsQuery = $state("");
  let isSearching = $state(false);
  let isSearchFailed = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchRequest = 0;
  let searchController: AbortController | undefined;

  const query = $derived(search.trim());
  const allActions = $derived.by(() => loadAllActions($appStore.actions));
  const filteredActions = $derived.by(() => {
    if (query) {
      return allActions.filter((x) =>
        x.cmdLabel.toLowerCase().includes(query.toLowerCase())
      );
    }
    return loadDefaultFilteredActions(allActions);
  });
  const contextItems = $derived.by(() => {
    if (scope !== "all" || !$activeContextActions) return [];
    try {
      return flattenContextActions($activeContextActions.resolve(), {
        hasActionHandler: Boolean($activeContextActions.onAction)
      });
    } catch (error) {
      logger.error({ at: "CmdResults.contextItems", error });
      return [];
    }
  });
  const contextLabel = $derived(
    $activeContextActions ? properCase($activeContextActions.resource) : ""
  );
  const entries = $derived(
    buildSuperBarEntries({
      query,
      scope,
      contextActions: contextItems,
      commands: scope === "all" ? filteredActions : [],
      results: resultsQuery === query ? results : []
    })
  );
  const selectedEntry = $derived(
    entries.find((entry) => entry.key === selectedKey) ?? entries[0]
  );
  $effect(() => {
    selectedKind = selectedEntry?.kind;
  });
  const hasPendingSearch = $derived(
    !!query && (isSearching || resultsQuery !== query)
  );

  $effect(() => {
    const value = query;
    selectedKey = null;
    cancelSearch();
    if (!value) {
      results = [];
      resultsQuery = "";
      isSearching = false;
      isSearchFailed = false;
      return;
    }
    isSearching = true;
    searchTimer = setTimeout(() => runSearch(value), SEARCH_DEBOUNCE_MS);
  });

  onDestroy(cancelSearch);

  function cancelSearch() {
    clearTimeout(searchTimer);
    searchRequest++;
    searchController?.abort();
    searchController = undefined;
  }

  async function runSearch(value: string) {
    const request = ++searchRequest;
    const controller = new AbortController();
    searchController = controller;
    let hits: ResourceSearchHit[] = [];
    let isFailed = false;
    try {
      hits = await searchResources({
        query: value,
        limit: SEARCH_LIMIT,
        signal: controller.signal
      });
    } catch (error) {
      if (request !== searchRequest) return;
      logger.error({ at: "CmdResults.runSearch", error });
      isFailed = true;
    }
    if (request !== searchRequest) return;
    searchController = undefined;
    results = hits.map((hit) => toSuperBarSearchHit(hit, value));
    resultsQuery = value;
    isSearchFailed = isFailed;
    isSearching = false;
  }

  /** Moves the keyboard selection through every group, wrapping around. */
  export function moveSelection(direction: "up" | "down") {
    if (entries.length === 0) return;
    const currentIndex = selectedEntry ? entries.indexOf(selectedEntry) : -1;
    const nextIndex =
      direction === "down"
        ? (currentIndex + 1) % entries.length
        : (currentIndex - 1 + entries.length) % entries.length;
    selectedKey = entries[nextIndex].key;
  }

  /** Runs the selected row; Cmd or Ctrl opens a result beside the page. */
  export async function select(event?: KeyboardEvent | MouseEvent) {
    if (selectedEntry) await runEntry(selectedEntry, event);
  }

  async function runEntry(
    entry: SuperBarEntry,
    event?: KeyboardEvent | MouseEvent
  ) {
    if (entry.kind === "result") {
      onClose?.();
      await tick();
      navigation.resourceClickHandler(event, entry.hit.id, {
        defaultTo: AccessMode.PAGE,
        origin: Action.CMD
      });
      return;
    }
    if (entry.kind === "context") {
      const onAction = $activeContextActions?.onAction;
      onClose?.();
      await tick();
      await runContextAction(entry.action, {
        runCommand: (command) => requireCommandHost().runAction(command),
        onAction
      });
      return;
    }
    await runCommand(entry.action);
  }

  async function runCommand(resolvedAction: ICommandAction) {
    if (resolvedAction.type === ActionType.SEARCH_CMD) {
      onSearchAction?.(resolvedAction);
    } else {
      onClose?.();
      await tick();
      requireCommandHost().runAction(resolvedAction.action, {
        componentParams: {
          isCmdBarLaunch: true
        }
      });
    }
    let recentCommands = isValidArrayWithData($userPreferences.recentCommands);
    if (recentCommands) {
      if (recentCommands.some(findInList(resolvedAction))) {
        recentCommands = recentCommands.filter(
          (x) => !findInList(resolvedAction)(x)
        );
      }
      recentCommands.unshift({
        action: resolvedAction.action,
        variant: resolvedAction.variant
      });
      recentCommands = recentCommands.slice(0, 5);
    } else {
      recentCommands = [
        {
          action: resolvedAction.action,
          variant: resolvedAction.variant
        }
      ];
    }
    userPreferences.setRecentCommands(recentCommands);
  }

  function loadAllActions(rawActions: IAction[]) {
    const actions: ICommandAction[] = [];
    const isPortraitLibraryAvailable = rawActions.some(
      (action) => action.action === Action.LIBRARY_PORTRAIT
    );
    const primitive = rawActions.filter(
      (action) =>
        action.label &&
        !action.isInactive &&
        !action.isMeta &&
        !(!$view.isPortrait && action.action === Action.LIBRARY_PORTRAIT) &&
        !(
          $view.isPortrait &&
          isPortraitLibraryAvailable &&
          action.action === Action.LIBRARY
        ) &&
        (action.preCondition ? action.preCondition() : true)
    );
    primitive.forEach((action) => {
      const rawCmdLabel = action.cmdLabel ?? action.label;
      if (typeof rawCmdLabel === "string") {
        actions.push({
          ...action,
          cmdLabel: rawCmdLabel
        });
      } else if (Array.isArray(rawCmdLabel) && rawCmdLabel.length > 0) {
        actions.push(
          ...rawCmdLabel.map((x) => {
            return {
              ...action,
              variant: x.variant,
              cmdLabel: x.label
            };
          })
        );
      }
    });
    return actions;
  }
  function loadDefaultFilteredActions(allActions: ICommandAction[]) {
    const recentCommands = isValidArrayWithData(
      $userPreferences.recentCommands
    );
    if (recentCommands) {
      let filteredActions = allActions.filter(
        (x) => !recentCommands.some(findInList(x))
      );
      const recentActions = recentCommands
        .map((x) => allActions.find(findInList(x)))
        .filter(isCommandAction);
      return [...recentActions, ...filteredActions];
    }
    return allActions;
  }

  function isCommandAction(
    action: ICommandAction | undefined
  ): action is ICommandAction {
    return Boolean(action);
  }

  function isSameAction(toCheck: ICommandAction | null, item: ICommandAction) {
    if (
      !toCheck ||
      typeof toCheck !== "object" ||
      !item ||
      typeof item !== "object"
    )
      return false;
    if (toCheck.variant) {
      return item.action === toCheck.action && item.variant === toCheck.variant;
    }
    return item.action === toCheck.action;
  }

  function findInList(toCheck: ICommandAction | null) {
    if (!toCheck) return () => false;
    return (item: ICommandAction) => {
      return isSameAction(toCheck, item);
    };
  }

  function isFirstOfKind(index: number) {
    return index === 0 || entries[index - 1].kind !== entries[index].kind;
  }

  function resolveGroupHeading(entry: SuperBarEntry) {
    if (entry.kind === "context") return `This ${contextLabel.toLowerCase()}`;
    if (entry.kind === "command") return query ? "Commands" : "";
    return "Results";
  }
</script>

{#snippet heading(label: string, testId: string)}
  <div
    class="w-full px-4 pt-3 pb-1 text-b3 text-fgs3 text-left"
    data-testid={testId}
  >
    {label}
  </div>
{/snippet}

{#each entries as entry, index (entry.key)}
  {#if isFirstOfKind(index) && resolveGroupHeading(entry)}
    {@render heading(
      resolveGroupHeading(entry),
      `super-bar-group-${entry.kind}`
    )}
  {/if}
  {#if entry.kind === "context"}
    <ResultItem
      {index}
      isActive={selectedEntry?.key === entry.key}
      onclick={(event) => {
        selectedKey = entry.key;
        void runEntry(entry, event);
      }}
    >
      <div class="flex min-w-0 flex-1 items-center gap-2">
        {#if entry.action.icon}
          <Icon icon={entry.action.icon} size={Size.sm} />
        {/if}
        <span class="truncate">{entry.action.label}</span>
      </div>
      {#if entry.action.item.hotKey}
        <ShortcutText
          shortcut={{ key: entry.action.item.hotKey }}
          parentBgIndex={2}
          size={Size.sm}
        />
      {/if}
      <div class="bg-bgs2 rounded-md text-b3 text-fgs2 px-2 py-1">
        {contextLabel.toLowerCase()}
      </div>
    </ResultItem>
  {:else if entry.kind === "command"}
    <CmdResultItem
      search={query}
      action={entry.action}
      {index}
      isActive={selectedEntry?.key === entry.key}
      onclick={() => {
        selectedKey = entry.key;
        void runEntry(entry);
      }}
    />
  {:else}
    <SearchResultRow
      hit={entry.hit}
      isActive={selectedEntry?.key === entry.key}
      onSelect={(event) => {
        selectedKey = entry.key;
        void runEntry(entry, event);
      }}
    />
  {/if}
{/each}
{#if query && hasPendingSearch && !entries.some((entry) => entry.kind === "result")}
  {@render heading("Results", "super-bar-group-result")}
  <div
    class="w-full flex items-center gap-2 px-4 py-2 text-b3 text-fgs3"
    data-testid="super-bar-searching"
  >
    <Icon icon="svg-spinners:3-dots-fade" />
    Searching...
  </div>
{:else if query && !hasPendingSearch && isSearchFailed && !entries.some((entry) => entry.kind === "result")}
  <EmptyStatusView
    size={Size.sm}
    mainText="Search failed"
    subText="Edit the query to try again"
  />
{:else if query && !hasPendingSearch && entries.length === 0}
  <EmptyStatusView size={Size.sm} mainText="No results found" />
{:else if !query && scope === "search"}
  <EmptyStatusView size={Size.sm} subText="Start typing to search" />
{/if}
