<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import {
    ButtonVariant,
    type IButtonParams,
    ButtonStyle
  } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import Button from "./Button.svelte";
  export let params: IButtonParams;
</script>

<Button
  type={params.variant ?? "secondary"}
  icon={params.icon}
  size={params.size ?? Size.md}
  style={ButtonStyle.OUTLINED}
  on:click={() => {
    if (params?.callback) params.callback();
  }}
>
  {params?.label}
  {#if !$view.isPortrait && (params.variant === ButtonVariant.SECONDARY || !params.variant)}
    <span class="rounded-md px-1 bg-bgs3 text-b5">Esc</span>
  {/if}
</Button>
