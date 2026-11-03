<script lang="ts">
  let { path, params }: { path?: string; params?: any } = $props();
</script>

<div data-testid="action-renderer" data-path={path}>
  {params?.notFoundPath ?? ""}
</div>
