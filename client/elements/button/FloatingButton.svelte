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
    {@const param = params[0]}
    <Button
      {...param}
      parentBgIndex={param.parentBgIndex}
      type={param.variant}
      style={param.style}
      on:click={async () => {
        if (param.callback) await param?.callback();
      }}
    />
  {:else}
    {#each params as param, index}
      <FloatingButtonItem {param} {index} length={params.length} />
    {/each}
  {/if}
</BottomFloat>
