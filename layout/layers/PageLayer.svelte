<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  function visibilityChangeListener() {
    if (document.visibilityState === "visible") {
      dispatch("appear");
    }
  }
</script>

<svelte:document on:visibilitychange={visibilityChangeListener} />
