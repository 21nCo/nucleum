<script lang="ts">
  import IphoneFrame from "./frames/IphoneFrame.svelte";

  export let device: "iphone" | "macbook";
</script>

{#if device === "iphone"}
  <IphoneFrame />
{/if}
