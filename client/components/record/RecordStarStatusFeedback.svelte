<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  export let isStarred = false;
  export let size: Size = Size.sm;
</script>

{#if isStarred}
  <Icon icon="star" class="text-yellow-400" {size} isFilled={true} on:click />
{/if}
