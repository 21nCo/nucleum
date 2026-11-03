<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import {
    SpaceNavItemType,
    type ISpaceNavItem
  } from "@nucleum/features/spaces/space.type";
  import { ActiveSpaceStore } from "@nucleum/features/spaces/space.store";

  let {
    spaceId,
    header
  }: {
    spaceId: string;
    header: Snippet;
  } = $props();

  const store = ActiveSpaceStore.resolve(spaceId);
  const items = $derived($store?.items ?? []);
</script>

{#snippet itemList(list: ISpaceNavItem[])}
  <ul class="flex flex-col gap-1 pl-4">
    {#each list as item (item.id)}
      <li class="flex flex-col gap-1">
        <span class="flex items-center gap-2 text-b2">
          <Icon
            icon={item.type === SpaceNavItemType.SECTION
              ? "folder"
              : resolveResourceIcon(item.resourceType)}
            size={Size.sm}
            class="stroke-fgs2"
          />
          {item.label || "Untitled"}
        </span>
        {#if item.children?.length}
          {@render itemList(item.children)}
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}

<div class="flex flex-col h-full w-full overflow-auto" data-testid="space-wall">
  <div class="w-full max-w-sm">
    {@render header()}
  </div>
  <section class="flex flex-col gap-3 p-6">
    <h2 class="text-h3 font-semibold">{$store?.label || "Untitled space"}</h2>
    {#if items.length > 0}
      {@render itemList(items)}
    {:else}
      <p class="text-b2 text-fgs3">No items yet</p>
    {/if}
  </section>
</div>
