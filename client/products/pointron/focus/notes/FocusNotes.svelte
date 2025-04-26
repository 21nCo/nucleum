<script lang="ts">
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import type { IMarkdown } from "$lib/client/components/markdown/md.type";
  export let md: IMarkdown;
  export let parentBgIndex: number = 1;
  export let isHideTitle: boolean = false;
  export let placeholder: string = "Start typing...";
</script>

<Markdown
  bind:md
  parentBackgroundIndex={parentBgIndex}
  params={{
    placeholder,
    actions: isHideTitle ? [] : ["copy"],
    title: isHideTitle ? undefined : "Notes",
    isReadOnly: false,
    canUseSlashShortcut: false
  }}
  on:change
  on:debouncedChange
>
  <slot name="title" slot="title"></slot>
</Markdown>
