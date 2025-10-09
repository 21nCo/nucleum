<script lang="ts">
  import SvelteMarkdown from "svelte-markdown";
  import Link from "./markdownRenderer/Link.svelte";

  export let text: string = "";
</script>

<div class="flex flex-col w-full">
  <SvelteMarkdown source={text} renderers={{ link: Link }} />
</div>

<style>
  :global(strong) {
    font-weight: 600 !important;
  }
  :global(h1, h2, h3, h4, h5, h6) {
    font-weight: 700 !important;
  }
  :global(a) {
    color: var(--color-aps1) !important;
    text-decoration: underline !important;
  }
  :global(li::before) {
    content: "• ";
  }
</style>
