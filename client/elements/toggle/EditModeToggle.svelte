<script lang="ts">
  import { isInEditMode } from "@21n/stores/app.store";
  import { Size } from "@21n/types/size.enum";
  import Button from "@21n/elements/button/Button.svelte";
  import Switch from "@21n/elements/toggle/Switch.svelte";
  export let isReadModeVariant: boolean = false;
</script>

{#if isReadModeVariant}
  <Button
    tooltip="Toggle read mode"
    icon="book-open"
    size={Size.sm}
    on:click={() => isInEditMode.toggle()}
  />
{:else}
  <button class="rounded-full flex items-center gap-2 px-3 py-1">
    <span class="text-fgs3 text-b2"> edit: </span>
    <Switch bind:on={$isInEditMode} size={Size.sm} />
  </button>
{/if}
