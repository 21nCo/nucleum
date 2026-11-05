<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { AccessMode } from "@nucleum/datafn/resource.type";
  import RightSplit from "@nucleum/shell/RightSplit.svelte";
  import { cn } from "@21n/ui/environment/presentation";
  let {
    children,
    isBottomBarAbsent
  }: {
    children?: Snippet;
    isBottomBarAbsent?: boolean;
  } = $props();
  let split = $state<string | undefined>(undefined);
  onMount(() => {
    const sub = page.subscribe((value) => {
      split = value?.url?.searchParams.get(AccessMode.BESIDE_BASE) ?? undefined;
    });
    return () => {
      sub();
    };
  });
</script>

<div
  class={cn("flex w-full h-full", {
    "pb-2": isBottomBarAbsent
  })}
>
  <div class="flex w-full h-full">
    <div class="flex h-full {split ? 'min-w-1/2 w-1/2 shrink-0' : 'w-full'}">
      {@render children?.()}
    </div>
    {#if split}
      <RightSplit {split} accessMode={AccessMode.BESIDE_BASE} />
    {/if}
  </div>
</div>
