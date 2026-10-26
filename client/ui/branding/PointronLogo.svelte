<script lang="ts">
  let { width }: { width: number } = $props();
</script>

<circle
  cx="232"
  cy="230"
  r={width}
  class="stroke-logo-dark dark:stroke-logo-light"
  stroke-width="12"
/>
