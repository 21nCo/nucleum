<script lang="ts">
  import type { IListContentItem } from "$lib/client/types/featureWheel.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let items: IListContentItem[];
</script>

<div class="flex flex-col gap-1 text-b2">
  {#each items as item}
    <div class="flex items-start gap-2">
      {#if item.icon}
        <Icon icon={item.icon} class="mt-[3px]" size={Size.sm} />
      {:else}
        <span class="ml-1 mr-1">•</span>
      {/if}
      <span class="text-fgs2">{item.label}</span>
    </div>
  {/each}
</div>
