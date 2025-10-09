<script lang="ts">
  import SvelteMarkdown from "svelte-markdown";
  import Link from "./markdownRenderer/Link.svelte";

  export let text: string = "";
</script>

<div class="markdown-renderer flex flex-col w-full">
  <SvelteMarkdown source={text} renderers={{ link: Link }} />
</div>

<style>
  :global(.markdown-renderer strong) {
    font-weight: 600 !important;
  }
  :global(.markdown-renderer h1),
  :global(.markdown-renderer h2),
  :global(.markdown-renderer h3),
  :global(.markdown-renderer h4),
  :global(.markdown-renderer h5),
  :global(.markdown-renderer h6) {
    font-weight: 700 !important;
  }
  :global(.markdown-renderer a) {
    color: var(--color-aps1) !important;
    text-decoration: underline !important;
  }
  :global(.markdown-renderer ul) {
    list-style: none;
    padding-left: 1.25rem;
  }
  :global(.markdown-renderer li::before) {
    content: "• ";
  }
</style>
