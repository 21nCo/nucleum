<script lang="ts">
  import { onMount } from "svelte";
  import { resolveComponentFromPath } from "$lib/tidy/utils/utils";
  import { ContentType, type Action } from "$lib/tidy/types/action.type";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  export let action: Action | null = null;
  export let path: string = "";
  export let params: any = {};
  onMount(() => {
    if (action === null && path !== "") {
      action = resolveComponentFromPath(path);
    }
  });
</script>

{#if action?.contentType === ContentType.BUTTON}
  <Button
    size={Size.sm}
    label={action?.label}
    on:click={() => {
      if (action?.fn) action?.fn();
    }}
  />
{:else if action?.contentType === ContentType.GATHERYDOC}
  <!--  -->
  <div>Gathery doc with id: {action.link}</div>
{:else}
  <svelte:component this={action?.component} {...params} />
{/if}
