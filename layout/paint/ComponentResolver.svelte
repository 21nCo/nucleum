<script lang="ts">
  import { onMount } from "svelte";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import { ContentType, type Action } from "$lib/tidy/types/action.type";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  export let currentComponent: Action | null = null;
  export let path: string = "";
  export let params: any = {};
  onMount(() => {
    if (currentComponent === null && path !== "") {
      currentComponent = resolveComponentFromPath(path);
    }
  });
</script>

{#if currentComponent?.contentType === ContentType.BUTTON}
  <Button
    size={Size.sm}
    label={currentComponent?.label}
    on:click={() => {
      if (currentComponent?.fn) currentComponent?.fn();
    }}
  />
{:else if currentComponent?.contentType === ContentType.GATHERYDOC}
  <!--  -->
{:else}
  <svelte:component this={currentComponent?.component} {...params} />
{/if}
