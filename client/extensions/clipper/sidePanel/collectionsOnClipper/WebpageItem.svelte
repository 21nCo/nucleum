<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import type { CollectionItem } from "./types";

  export let item: CollectionItem;

  function getFaviconUrl(url?: string): string | null {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch {
      return null;
    }
  }

  function handleImageError(event: Event) {
    const target = event.target as HTMLImageElement | null;
    if (target) {
      target.style.display = "none";
    }
  }
</script>

<button
  class="flex items-start w-full gap-3 p-3 rounded-lg hover:bg-bgs2 cursor-pointer group"
  on:click={(e) => {
    if (!item.url) return;
    if (e.metaKey || e.ctrlKey) {
      window.open(item.url, "_blank");
    } else {
      chrome.tabs.update({ url: item.url });
    }
  }}
>
  <div class="flex-shrink-0 mt-1">
    {#if getFaviconUrl(item.url)}
      <img
        src={getFaviconUrl(item.url)}
        alt="favicon"
        class="w-4 h-4 rounded"
        on:error={handleImageError}
      />
    {:else}
      <Icon icon="ph:globe" size={Size.sm} />
    {/if}
  </div>
  <div class="flex flex-col items-start flex-1 min-w-0">
    <div
      class="text-left font-medium text-fgs1 text-b2 line-clamp-1 group-hover:text-aps1 transition-colors"
    >
      {item.label}
    </div>
    {#if item.url}
      <div class="text-fgs3 text-b3 mt-1 truncate">
        {new URL(item.url).hostname}
      </div>
    {/if}
  </div>
</button>

<style>
  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
