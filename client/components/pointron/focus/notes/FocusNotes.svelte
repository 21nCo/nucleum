<script lang="ts">
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import type { IMarkdown } from "$lib/client/types/memotron/md.type";
  export let md: IMarkdown;
  export let parentBgIndex: number = 1;
</script>

<Markdown
  bind:md
  parentBackgroundIndex={parentBgIndex}
  params={{
    placeholder: "Start typing...",
    actions: ["copy"],
    title: "Notes",
    isReadOnly: false,
    canUseSlashShortcut: false
  }}
  on:change
/>
