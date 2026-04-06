<script lang="ts">
  import type { IListContentItem } from "@21n/types/featureWheel.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";

  let { items }: { items: IListContentItem[] } = $props();
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
