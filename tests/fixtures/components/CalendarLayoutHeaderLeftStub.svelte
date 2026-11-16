<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    panel = $bindable(),
    headerLeftOptions = undefined
  }: {
    panel?: unknown;
    headerLeftOptions?: Snippet<[boolean]>;
    [key: string]: unknown;
  } = $props();
</script>

<div data-panel={String(panel)}>{@render headerLeftOptions?.(false)}</div>
