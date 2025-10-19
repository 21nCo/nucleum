<script lang="ts">
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import ComposeDuration from "@21n/products/pointron/focus/advanced/composition/ComposeDuration.svelte";
  function onCompositionChanges() {
    activeSession.onComposeComplete();
  }
</script>

<ComposeDuration
  bind:composition={$activeSession.composition}
  on:change={onCompositionChanges}
/>
