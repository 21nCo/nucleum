<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import ComposeDuration from "./ComposeDuration.svelte";
  function onCompositionChanges() {
    sessionStore.onComposeComplete();
  }
</script>

<ComposeDuration
  bind:composition={$sessionStore.composition}
  on:change={onCompositionChanges}
/>
