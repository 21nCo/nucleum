<script lang="ts">
  import { Direction } from "../types/direction.enum";
  import { IconVariant } from "../types/icon.type";
  export let direction: Direction = Direction.Left;
  export let variant: IconVariant = IconVariant.Outline;
</script>

{#if variant === IconVariant.Outline}
  {#if direction === Direction.Left}
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M19.5 12h-15m0 0l6.75 6.75M4.5 12l6.75-6.75"
    />
  {:else if direction === Direction.Right}
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
    />
  {:else if direction === Direction.Up}
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75"
    />
  {:else if direction === Direction.Down}
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75"
    />
  {/if}
{:else if variant === IconVariant.Mini}
  {#if direction === Direction.Left}
    <path
      fill-rule="evenodd"
      d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
      clip-rule="evenodd"
    />
  {:else if direction === Direction.Right}
    <path
      fill-rule="evenodd"
      d="M5 10a.75.75 0 01.75-.75h6.638L10.23 7.29a.75.75 0 111.04-1.08l3.5 3.25a.75.75 0 010 1.08l-3.5 3.25a.75.75 0 11-1.04-1.08l2.158-1.96H5.75A.75.75 0 015 10z"
      clip-rule="evenodd"
    />
  {:else if direction === Direction.Up}
    <path
      fill-rule="evenodd"
      d="M10 15a.75.75 0 01-.75-.75V7.612L7.29 9.77a.75.75 0 01-1.08-1.04l3.25-3.5a.75.75 0 011.08 0l3.25 3.5a.75.75 0 11-1.08 1.04l-1.96-2.158v6.638A.75.75 0 0110 15z"
      clip-rule="evenodd"
    />
  {:else if direction === Direction.Down}
    <path
      fill-rule="evenodd"
      d="M10 5a.75.75 0 01.75.75v6.638l1.96-2.158a.75.75 0 111.08 1.04l-3.25 3.5a.75.75 0 01-1.08 0l-3.25-3.5a.75.75 0 111.08-1.04l1.96 2.158V5.75A.75.75 0 0110 5z"
      clip-rule="evenodd"
    />
  {/if}
{/if}
