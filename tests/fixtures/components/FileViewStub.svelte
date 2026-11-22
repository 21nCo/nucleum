<script lang="ts">
  /**
   * Stands in for FileView: one media element carrying the class, style and
   * bound `ref` FileView gives its image, so a test can see where a layout
   * places and sizes a file's element.
   */
  let {
    ref = $bindable(),
    class: className = "",
    style = ""
  }: {
    ref?: HTMLElement | undefined;
    class?: string;
    style?: string;
  } = $props();
</script>

<img data-testid="file-view" alt="" class={className} {style} bind:this={ref} />
