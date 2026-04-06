<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import type { IListItem } from "@21n/landing/shared/landing.type";

  let {
    items,
  }: {
    items: IListItem[];
  } = $props();
  const currentPath = typeof window !== "undefined" ? window.location.href : "";
</script>

<div class="flex flex-col gap-3 text-b2 2k:text-lb2">
  {#each items as item}
    {#if item.title && item.href}
      <a
        class={cn("block text-fgs2 hover:text-aps1", {
          "pointer-events-none opacity-30": currentPath.includes(
            item.title.toLowerCase()
          )
        })}
        href={item.href}>{item.title}</a
      >
    {:else}
      <p class="text-fgs1 font-semibold">
        {item.title}
      </p>
    {/if}
  {/each}
</div>
