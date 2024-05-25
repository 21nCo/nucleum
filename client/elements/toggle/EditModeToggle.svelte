<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "../button/Button.svelte";
  import Switch from "./Switch.svelte";
  export let isReadModeVariant: boolean = false;
</script>

{#if isReadModeVariant}
  <Button
    tooltip="Toggle read mode"
    icon="book-open"
    size={Size.sm}
    isStayActive={!$isInEditMode}
    on:click={() => isInEditMode.toggle()}
  />
{:else}
  <button class="rounded-full flex items-center gap-2 px-3 py-1">
    <span class="text-fgs3 text-b2"> edit: </span>
    <Switch bind:on={$isInEditMode} size={Size.sm} />
  </button>
{/if}
