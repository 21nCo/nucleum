<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "@21n/utils/ui.utils";

  let {
    label,
    isActive = false,
    children = undefined,
    onclick = undefined
  }: {
    label: string;
    isActive?: boolean;
    children?: Snippet | undefined;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
  let itemRef: HTMLButtonElement;
  $effect(() => {
    if (isActive && itemRef) {
      itemRef.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  });
</script>

<button
  bind:this={itemRef}
  onclick={onclick}
  class={cn("p-2 w-full hover:bg-bgs2-striped flex items-start", {
    "bg-bgs2 font-medium": isActive,
    "min-h-[2.5rem] h-10": !children
  })}
>
  {#if children}
    {@render children()}
  {:else}
    <span class="truncate">
      {label}
    </span>
  {/if}
</button>
