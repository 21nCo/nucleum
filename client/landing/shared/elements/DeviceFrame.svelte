<script lang="ts">
  import IphoneFrame from "@21n/landing/shared/elements/frames/IphoneFrame.svelte";

  let {
    device,
  }: {
    device: "iphone" | "macbook";
  } = $props();
</script>

{#if device === "iphone"}
  <IphoneFrame />
{/if}
