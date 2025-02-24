<script lang="ts">
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import ComposeDuration from "./ComposeDuration.svelte";
  function onCompositionChanges() {
    activeSession.onComposeComplete();
  }
</script>

<ComposeDuration
  bind:composition={$activeSession.composition}
  on:change={onCompositionChanges}
/>
