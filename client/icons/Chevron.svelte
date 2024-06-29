<script lang="ts">
  import { Position } from "../types/direction.enum";
  export let direction: Position = Position.Left;
</script>

{#if direction === Position.Left}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M15.75 19.5L8.25 12l7.5-7.5"
  />
{:else if direction === Position.Right}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M8.25 4.5l7.5 7.5-7.5 7.5"
  />
{:else if direction === Position.Top}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M4.5 15.75l7.5-7.5 7.5 7.5"
  />
{:else if direction === Position.Bottom}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
  />
{/if}
