<script lang="ts">
  import { onDestroy } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
  import type { Product } from "@nucleum/client/config/product.type";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import {
    determineResourceType,
    resolveResourceIcon
  } from "@nucleum/datafn/resource.utils";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import type { ISpaceNavItem } from "@nucleum/features/spaces/space.type";
  import {
    collectChildSpaceIds,
    resolveAddBlockReason,
    resolveSpaceItemResources,
    resolveTargetLabel
  } from "@nucleum/features/spaces/space.utils";

  let {
    product,
    currentSpaceId,
    focusChain,
    items,
    targetLabel = undefined,
    targetId = undefined,
    onSelect
  }: {
    product: Product;
    currentSpaceId: string;
    focusChain: string[];
    items: ISpaceNavItem[];
    /** Name of the section new items are added to, when not the root. */
    targetLabel?: string;
    /** Id of the section new items are added to, when not the root. */
    targetId?: string;
    /** Receives the picked record and the section it was picked for. */
    onSelect: (
      record: { id: string; label: string; avatar?: IAvatar },
      targetId: string | undefined
    ) => void;
  } = $props();

  type PickerResult = {
    id: string;
    label: string;
    avatar?: IAvatar;
    resource: Resource;
  };

  const listId = `space-picker-${currentSpaceId.slice(-5)}`;
  let query = $state("");
  let results = $state.raw<PickerResult[]>([]);
  let spaceGraph = $state<Map<string, string[]> | undefined>(undefined);
  let isSearching = $state(false);
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let spaceGraphLoad: Promise<void> | undefined;
  let requestId = 0;
  const resources = $derived(resolveSpaceItemResources(product));

  let isDestroyed = false;
  onDestroy(() => {
    isDestroyed = true;
    clearTimeout(debounce);
  });

  function blockReason(id: string) {
    return resolveAddBlockReason({
      candidateId: id,
      currentSpaceId,
      focusChain,
      items,
      childSpaceIds: spaceGraph
        ? (spaceId) => spaceGraph?.get(spaceId) ?? []
        : undefined
    });
  }

  async function loadSpaceGraph() {
    try {
      const result = await datafn.space.query({
        select: ["id", "items"],
        metadata: { includeTrashed: true, includeArchived: true }
      } as any);
      const rows = (result.data ?? []) as {
        id: string;
        items?: ISpaceNavItem[];
      }[];
      spaceGraph = new Map(
        rows.map((row) => [row.id, collectChildSpaceIds(row.items ?? [])])
      );
    } catch (error) {
      spaceGraph = undefined;
      spaceGraphLoad = undefined;
      logger.error({ at: "SpaceItemPicker.loadSpaceGraph", error });
    }
  }

  async function search(value: string) {
    const trimmed = value.trim();
    const current = ++requestId;
    if (!trimmed) {
      results = [];
      isSearching = false;
      return;
    }
    isSearching = true;
    try {
      const [searchResult] = await Promise.all([
        datafn.search({
          query: trimmed,
          resources,
          limit: 20,
          limitPerResource: 20,
          source: "local",
          prefix: true,
          fuzzy: 0.2
        }),
        (spaceGraphLoad ??= loadSpaceGraph())
      ]);
      if (current !== requestId) return;
      results = (
        (searchResult as { results?: { data: Record<string, any> }[] })
          .results ?? []
      )
        .map((entry) => entry.data)
        .filter((record) => record?.id)
        .map((record) => ({
          id: record.id.toString(),
          label: resolveTargetLabel(record) ?? "Untitled",
          avatar: record.avatar,
          resource: determineResourceType(record.id)
        }))
        .filter((record) => resources.includes(record.resource));
    } catch (error) {
      logger.error({ at: "SpaceItemPicker.search", error });
      if (current === requestId) results = [];
    } finally {
      if (current === requestId) isSearching = false;
    }
  }

  function onInput() {
    clearTimeout(debounce);
    requestId++;
    results = [];
    isSearching = Boolean(query.trim());
    debounce = setTimeout(() => search(query), 200);
  }

  async function select(result: PickerResult) {
    const destination = targetId;
    if (result.resource === Resource.space) {
      spaceGraphLoad = loadSpaceGraph();
      await spaceGraphLoad;
    }
    if (isDestroyed || blockReason(result.id)) return;
    onSelect(
      { id: result.id, label: result.label, avatar: result.avatar },
      destination
    );
    query = "";
    results = [];
  }
</script>

<div class="flex flex-col gap-2 w-full" data-testid="space-item-picker">
  <label
    class="flex items-center gap-2 px-2 h-9 rounded-md border border-brs2 bg-bgs1 focus-within:border-aps1"
  >
    <Icon icon="magnifying-glass" size={Size.sm} class="stroke-fgs3" />
    <input
      type="search"
      class="flex-1 min-w-0 bg-transparent text-b2 outline-none"
      placeholder={targetLabel
        ? `Add to ${targetLabel}`
        : "Add an item or space"}
      aria-label="Search records to add"
      aria-controls={listId}
      bind:value={query}
      oninput={onInput}
    />
  </label>
  {#if query.trim()}
    <ul
      id={listId}
      class="flex flex-col max-h-64 overflow-auto"
      aria-live="polite"
    >
      {#each results as result (result.id)}
        {@const reason = blockReason(result.id)}
        <li>
          <button
            type="button"
            class={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left",
              {
                "hover:bg-bgs2-striped": !reason,
                "cursor-not-allowed opacity-60": Boolean(reason)
              }
            )}
            disabled={Boolean(reason)}
            title={reason}
            data-testid="space-picker-result"
            onclick={() => select(result)}
          >
            <span class="flex w-5 h-5 shrink-0 items-center justify-center">
              {#if result.avatar}
                <AvatarRenderer avatar={result.avatar} size={Size.sm} />
              {:else}
                <Icon
                  icon={resolveResourceIcon(result.resource)}
                  size={Size.sm}
                  class="stroke-fgs2"
                />
              {/if}
            </span>
            <span class="flex flex-col min-w-0">
              <span class="truncate text-b2">{result.label}</span>
              {#if reason}
                <span class="text-b4 text-fgs3">{reason}</span>
              {/if}
            </span>
          </button>
        </li>
      {:else}
        <li class="px-2 py-1 text-b3 text-fgs3">
          {isSearching ? "Searching" : "No matches"}
        </li>
      {/each}
    </ul>
  {/if}
</div>
