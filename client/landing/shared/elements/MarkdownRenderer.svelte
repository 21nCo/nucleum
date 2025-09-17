<script lang="ts">
  import SvelteMarkdown from "svelte-markdown";
  import Link from "./Link.svelte";

  export let text: string = "";
</script>

<SvelteMarkdown source={text} renderers={{ link: Link }} />
