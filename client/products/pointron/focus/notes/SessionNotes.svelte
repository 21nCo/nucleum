<script>
  import { activeSession } from "../session.store";
  import FocusNotes from "./FocusNotes.svelte";
</script>

<FocusNotes
  bind:md={$activeSession.notes}
  parentBgIndex={2}
  on:change={(e) => {
    activeSession.saveNotes();
  }}
/>
