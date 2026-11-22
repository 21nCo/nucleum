<script lang="ts">
  /**
   * Stands in for FileView: one media element carrying the class, style and
   * bound `ref` FileView gives its image, so a test can see where a layout
   * places and sizes a file's element. Like FileView, it renders nothing for
   * a file of a kind it does not show (a PDF or audio).
   */
  let {
    ref = $bindable(),
    file = undefined,
    class: className = "",
    style = ""
  }: {
    ref?: HTMLElement | undefined;
    file?: { type?: string } | null;
    class?: string;
    style?: string;
  } = $props();
  const isShown = $derived(!/^(application|audio)\//.test(file?.type ?? ""));
</script>

{#if isShown}
  <img
    data-testid="file-view"
    alt=""
    class={className}
    {style}
    bind:this={ref}
  />
{/if}
