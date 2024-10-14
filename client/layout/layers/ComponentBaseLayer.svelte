<script lang="ts">
  import { flux } from "$lib/client/components/flux/flux";
  import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { appStore } from "$lib/client/stores/app.store";
  import { createEventDispatcher, onDestroy, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  /**
   * This component or page has drag and drop functionality to it. Dragging external files into the app while this component or page is active will not trigger global drag and drop catcher.
   */
  export let hasDragAndDrop = false;

  /**
   * Resources to subscribe to - a change event will be dispatched if any mutation happens to these resources from anywhere else in the app so that derived or dependant stores can be reloaded or pages/components can be refreshed
   */
  export let subscribeTo: Resource[] = [];

  /**
   * Performs sync down action on mount if the user is a cloud user and if this flag is set to true
   */
  export let syncDownOnMount = false;

  function visibilityChangeListener() {
    dispatch("appear");
  }

  onMount(() => {
    if (hasDragAndDrop) {
      $appStore.isDnDPageActive = true;
    }
    if (syncDownOnMount) {
      //TODO avoid duplicate syncDown if already triggered by global syncDown on appear
      flux.syncDown();
    }
  });

  onDestroy(() => {
    if (hasDragAndDrop) {
      $appStore.isDnDPageActive = false;
    }
  });

  /**
   * TODO - detect resources that have been mutated and dispatch a change event if subscribed to
   * @param e
   */
  function onMutation(e: CustomEvent<{ resource: Resource; params: any }>) {
    if (e.detail && subscribeTo.includes(e.detail.resource)) {
      dispatch("change", e.detail);
    }
  }
</script>

<svelte:window
  on:focus={visibilityChangeListener}
  on:syncDown
  on:mutation={onMutation}
/>
