<script lang="ts">
  import { sessionStore } from "$lib/client/components/pointron/focus/session.store";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
</script>

<Markdown
  bind:md={$sessionStore.notes}
  parentBackgroundIndex={2}
  params={{
    placeholder: "Start typing...",
    actions: ["copy"],
    title: "Notes",
    isReadOnly: false,
    canUseSlashShortcut: false
  }}
  on:change={(e) => {
    sessionStore.persist(true);
  }}
/>
