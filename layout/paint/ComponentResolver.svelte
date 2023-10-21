<script lang="ts">
  import { onMount } from "svelte";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import { BlockType } from "$lib/tidy/types/action.type";
  import Button from "$lib/tidy/elements/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  export let currentComponent: any = undefined;
  export let path: string = "";
  export let params: any = {};
  onMount(() => {
    if (currentComponent === undefined && path !== "") {
      currentComponent = resolveComponentFromPath(path);
    }
  });
</script>

{#if currentComponent?.type === BlockType.BUTTON}
  <Button
    size={Size.sm}
    label={currentComponent?.label}
    on:click={currentComponent?.action}
  />
{:else}
  <svelte:component this={currentComponent?.component} {...params} />
{/if}
