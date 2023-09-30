<script lang="ts">
  import { IconVariant } from "../types/icon.type";
  export let variant: IconVariant = IconVariant.Outline;
  export let isCircled: boolean = false;
</script>

{#if isCircled}
  {#if variant === IconVariant.Outline}
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  {:else if variant === IconVariant.Solid}
    <path
      fill-rule="evenodd"
      d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z"
      clip-rule="evenodd"
    />
  {:else if variant === IconVariant.Mini}
    <path
      fill-rule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
      clip-rule="evenodd"
    />
  {/if}
{:else}
  <!-- else content here -->
{/if}
