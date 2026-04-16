<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    isActive = false,
    children = undefined,
    onclick = undefined
  }: {
    isActive?: boolean;
    children?: Snippet | undefined;
    onclick?: ((event: MouseEvent) => void) | undefined;
  } = $props();
</script>

<button
  onclick={onclick}
  class={`text-[0.875rem] leading-8 py-1 px-2 rounded-sm font-medium w-full cursor-pointer hover:bg-bgs4 text-left ${
    isActive ? `bg-bgs4` : ``
  }`}
>
  {@render children?.()}
</button
>
