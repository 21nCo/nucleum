<script lang="ts">
  import { toSvelteStore } from "@datafn/svelte";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { headingNodeTypes } from "@nucleum/features/memory/node/node.type";
  import type { NodeType } from "@nucleum/schema/legacy/node-type.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import type { ISpaceHeading } from "@nucleum/features/spaces/space.type";
  import {
    buildHeadingTree,
    resolveSpaceHeadingQueries
  } from "@nucleum/features/spaces/space.utils";

  let {
    nodeId,
    depth = 1,
    activeHeadingId = undefined,
    onSelect
  }: {
    nodeId: string;
    depth?: number;
    activeHeadingId?: string;
    onSelect: (headingId: string) => void;
  } = $props();

  type BlockRecord = {
    id: string;
    label?: string;
    body?: unknown;
    contentType?: string;
    mdChildOrder?: string[];
  };

  const queries = $derived(resolveSpaceHeadingQueries(nodeId));
  const pageStore = $derived(
    toSvelteStore<BlockRecord[]>(datafn.node.signal(queries.page), {
      initialData: []
    })
  );
  const blockStore = $derived(
    toSvelteStore<BlockRecord[]>(datafn.node.signal(queries.blocks), {
      initialData: []
    })
  );
  const headings = $derived(
    buildHeadingTree(
      collectHeadings(
        $pageStore.data?.[0]?.mdChildOrder ?? [],
        $blockStore.data ?? []
      )
    )
  );
  const isLoading = $derived($blockStore.loading);

  function collectHeadings(rootOrder: string[], blocks: BlockRecord[]) {
    const byId = new Map(blocks.map((block) => [block.id, block]));
    const visited = new Set<string>();
    const result: { id: string; label: string; level: number }[] = [];
    const visit = (order: string[]) => {
      for (const id of order) {
        const block = byId.get(id);
        if (!block || visited.has(id)) continue;
        visited.add(id);
        if (
          block.contentType &&
          headingNodeTypes.includes(block.contentType as NodeType)
        ) {
          result.push({
            id: block.id,
            label: resolveHeadingLabel(block),
            level: Number(block.contentType.slice(-1)) || 6
          });
        }
        visit(block.mdChildOrder ?? []);
      }
    };
    visit(rootOrder);
    return result;
  }

  function resolveHeadingLabel(record: BlockRecord) {
    const label = record.label?.trim();
    if (label) return label;
    if (typeof record.body === "string" && record.body.trim())
      return record.body.trim();
    return "Untitled heading";
  }
</script>

{#snippet headingList(list: ISpaceHeading[], level: number)}
  <ul class="flex flex-col">
    {#each list as heading (heading.id)}
      <li class="flex flex-col">
        <button
          type="button"
          class={cn(
            "flex items-center w-full pr-2 py-1 rounded-md text-left text-b3 truncate hover:bg-bgs2-striped focus-visible:outline focus-visible:outline-2 focus-visible:outline-aps1",
            {
              "text-fgs1 bg-bgs2": activeHeadingId === heading.id,
              "text-fgs2": activeHeadingId !== heading.id
            }
          )}
          style:padding-left={`${Math.min(level, 6) + 1.75}rem`}
          data-testid="space-heading-item"
          data-heading-id={heading.id}
          onclick={() => onSelect(heading.id)}
        >
          <span class="truncate">{heading.label}</span>
        </button>
        {#if heading.children.length > 0}
          {@render headingList(heading.children, level + 1)}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

{#if headings.length > 0}
  {@render headingList(headings, depth)}
{:else if !isLoading}
  <p
    class="py-1 text-b4 text-fgs3"
    style:padding-left={`${Math.min(depth, 6) + 1.75}rem`}
  >
    No headings
  </p>
{/if}
