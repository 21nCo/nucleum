<script lang="ts">
  import { appStore } from "$lib/client/stores/app.store";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  export let isDragAndDropPage = false;
  const dispatch = createEventDispatcher();

  function visibilityChangeListener() {
    dispatch("appear");
  }

  onMount(() => {
    if (isDragAndDropPage) {
      $appStore.isDnDPageActive = true;
    }
  });

  onDestroy(() => {
    if (isDragAndDropPage) {
      $appStore.isDnDPageActive = false;
    }
  });
</script>

<svelte:window on:focus={visibilityChangeListener} on:syncDown />
