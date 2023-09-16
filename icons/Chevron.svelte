<script lang="ts">
  import { Direction } from "../types/direction.enum";
  export let direction: Direction = Direction.Left;
</script>

{#if direction === Direction.Left}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M15.75 19.5L8.25 12l7.5-7.5"
  />
{:else if direction === Direction.Right}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M8.25 4.5l7.5 7.5-7.5 7.5"
  />
{:else if direction === Direction.Up}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M4.5 15.75l7.5-7.5 7.5 7.5"
  />
{:else if direction === Direction.Down}
  <path
    stroke-linecap="round"
    stroke-linejoin="round"
    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
  />
{/if}
