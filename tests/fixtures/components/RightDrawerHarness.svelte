<script lang="ts">
  import type { Component, Snippet } from "svelte";
  let {
    drawer: Drawer,
    alignment,
    onInnerKey
  }: {
    drawer: Component<{
      id: string;
      title: string;
      alignment: string;
      children: Snippet;
    }>;
    alignment: string;
    onInnerKey?: (event: KeyboardEvent) => void;
  } = $props();
</script>

<Drawer id="appearance-settings" title="Appearance" {alignment}>
  <button type="button" data-testid="inner" onkeydown={onInnerKey}>
    Inner
  </button>
</Drawer>
