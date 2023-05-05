<script lang="ts">
  import { onMount } from "svelte";
  import { getComponentFromPath } from "$lib/tidy/utils/utils";
  export let currentComponent: any = undefined;
  export let path: string = "";
  onMount(() => {
    if (currentComponent === undefined && path !== "") {
      currentComponent = getComponentFromPath(path);
    }
  });
</script>

<svelte:component this={currentComponent?.component} />
