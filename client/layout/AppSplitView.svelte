<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import RightSplit from "./RightSplit.svelte";
  let split: string | undefined = undefined;
  onMount(() => {
    const sub = page.subscribe((value) => {
      split = value.url.searchParams.get(ResourceAccessMode.SPLIT) ?? undefined;
    });
    return () => {
      sub();
    };
  });
</script>

<div class="flex w-full h-full">
  <div class="flex h-full {split ? 'w-1/2' : 'w-full'}">
    <slot name="main" />
  </div>
  {#if split}
    <RightSplit {split} />
  {/if}
</div>
