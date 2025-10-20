<script lang="ts">
  import IphoneFrame from "@21n/landing/shared/elements/frames/IphoneFrame.svelte";

  export let device: "iphone" | "macbook";
</script>

{#if device === "iphone"}
  <IphoneFrame />
{/if}
