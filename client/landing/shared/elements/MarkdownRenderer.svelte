<script lang="ts">
  import SvelteMarkdown from "svelte-markdown";
  import Link from "@21n/landing/shared/elements/markdownRenderer/Link.svelte";

  export let text: string = "";
</script>

<SvelteMarkdown source={text} renderers={{ link: Link }} />

<style>
  :global(strong) {
    font-weight: 600 !important;
  }
</style>
