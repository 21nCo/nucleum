<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  export let isStarred = false;
</script>

{#if isStarred}
  <Icon icon="star" class="fill-yellow-400" />
{/if}
