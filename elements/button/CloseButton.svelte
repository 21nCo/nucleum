<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";
  import {
    ButtonVariant,
    type ButtonParams
  } from "$lib/tidy/types/button.type";
  import { Size } from "$lib/tidy/types/size.enum";
  import Button from "./Button.svelte";
  export let params: ButtonParams;
</script>

<Button
  type={params.variant ?? "secondary"}
  icon={params.icon}
  size={Size.sm}
  on:click={() => {
    if (params?.callback) params.callback();
  }}
>
  {params?.label}
  {#if !$windowObject.isInPortraitMode && (params.variant === ButtonVariant.SECONDARY || !params.variant)}
    <span class=" text-b4">Esc</span>
  {/if}
</Button>
