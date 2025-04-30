<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IListItem } from "../landing.type";

  export let items: IListItem[];
  const currentPath = typeof window !== "undefined" ? window.location.href : "";
  console.log(
    currentPath,
    items[0].title,
    currentPath.includes(items[0].title.toLowerCase())
  );
</script>

<div class="flex flex-col gap-3 text-b2 2k:text-lb2">
  {#each items as item}
    {#if item.title && item.href}
      <a
        class={cn(
          "block text-fgs2 hover:text-aps1",
          currentPath.includes(item.title.toLowerCase()) &&
            "pointer-events-none opacity-30"
        )}
        href={item.href}>{item.title}</a
      >
    {:else}
      <p class="text-fgs1 font-semibold">
        {item.title}
      </p>
    {/if}
  {/each}
</div>
