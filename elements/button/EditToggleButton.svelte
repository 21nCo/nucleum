<script lang="ts">
  import { isInEditMode } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "./Button.svelte";
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
  <Button
    label={"edit: " + ($isInEditMode ? "on" : "off")}
    size={Size.xs}
    on:click={() => isInEditMode.toggle()}
  />
{/if}
