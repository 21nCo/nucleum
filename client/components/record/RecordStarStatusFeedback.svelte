<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let isStarred = false;
  export let size: Size = Size.sm;
</script>

{#if isStarred}
  <Icon icon="star" class="text-yellow-400" {size} isFilled={true} on:click />
{/if}
