<script lang="ts">
  import { view } from "$lib/tidy/stores/app.store";
  import {
    ButtonVariant,
    type ButtonParams
  } from "$lib/tidy/types/button.type";
  import Button from "./Button.svelte";
  export let params: ButtonParams;
</script>

<Button
  type={params.variant ?? "secondary"}
  icon={params.icon}
  size={params.size}
  on:click={() => {
    if (params?.callback) params.callback();
  }}
>
  {params?.label}
  {#if !$view.isPortrait && (params.variant === ButtonVariant.SECONDARY || !params.variant)}
    <span class="rounded-md px-1 bg-bgs3 text-b5">Esc</span>
  {/if}
</Button>
