<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { AccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import RightSplit from "@21n/layout/RightSplit.svelte";
  let { children }: { children?: Snippet } = $props();
  let split = $state<string | undefined>(undefined);
  onMount(() => {
    const sub = page.subscribe((value) => {
      split = value.url.searchParams.get(AccessMode.SPLIT) ?? undefined;
    });
    return () => {
      sub();
    };
  });
</script>

<div class="flex w-full h-full">
  <div class="flex h-full {split ? 'min-w-1/2 w-1/2 shrink-0' : 'w-full'}">
    {@render children?.()}
  </div>
  {#if split}
    <RightSplit {split} accessMode={AccessMode.SPLIT} />
  {/if}
</div>
