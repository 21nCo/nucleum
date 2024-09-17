<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  function visibilityChangeListener() {
    dispatch("appear");
  }
</script>

<svelte:window on:focus={visibilityChangeListener} on:syncDown />
