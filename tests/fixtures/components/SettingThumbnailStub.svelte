<script lang="ts">
  let { action, onclick }: { action: string; onclick?: () => void } = $props();
</script>

<button type="button" data-testid={`setting-${action}`} {onclick}>
  {action}
</button>
