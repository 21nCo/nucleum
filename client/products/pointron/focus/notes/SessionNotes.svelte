<script>
  import { sessionStore } from "../session.store";
  import FocusNotes from "./FocusNotes.svelte";
</script>

<FocusNotes
  bind:md={$sessionStore.notes}
  parentBgIndex={2}
  on:change={(e) => {
    sessionStore.persist(true);
  }}
/>
