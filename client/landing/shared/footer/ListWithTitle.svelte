<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IListItem } from "../Landing.types";

  export let items: IListItem[];
  const currentPath = window.location.href;
  console.log(
    currentPath,
    items[0].title,
    currentPath.includes(items[0].title.toLowerCase())
  );
</script>

<div class="flex flex-col gap-4">
  {#each items as item}
    {#if item.title && item.href}
      <a
        class={cn(
          "block text-fgs1 text-[20px] font-medium leading-[28px] hover:text-aps1",
          currentPath.includes(item.title.toLowerCase()) &&
            "pointer-events-none opacity-30"
        )}
        href={item.href}>{item.title}</a
      >
    {:else}
      <p class="text-fgs3 text-base underline font-normal leading-[22px] mt-4">
        {item.title}
      </p>
    {/if}
  {/each}
</div>
