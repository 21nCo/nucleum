<script lang="ts">
  import SupaHubEmbedCode from "./SupaHubEmbedCode.svelte";
  export let context: "Roadmap" | "Changelog" | "Board";
  console.log({ context });
</script>

<SupaHubEmbedCode {context} />
