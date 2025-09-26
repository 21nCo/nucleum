<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { IButtonParams } from "$lib/client/types/button.type";
  import BottomFloat from "../BottomFloat.svelte";
  import FloatingButtonItem from "./floating/FloatingButtonItem.svelte";
  export let params: IButtonParams[];
  let classList: string = "";
  export { classList as class };
</script>

<BottomFloat class={classList}>
  {#if params.length === 1}
    <Button
      {...params[0]}
      parentBgIndex={params[0].parentBgIndex}
      type={params[0].variant}
      on:click={async () => {
        if (params[0].callback) await params[0]?.callback();
      }}
    />
  {:else}
    {#each params as param, index}
      <FloatingButtonItem {param} {index} length={params.length} />
    {/each}
  {/if}
</BottomFloat>
