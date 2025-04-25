<script lang="ts">
  import Button from "../elements/Button.svelte";
  export let cta: any;
</script>

{#if cta}
  <Button
    label={cta.label}
    isShort={true}
    on:click={() => {
      window.location.href = cta.href ?? "";
    }}
  />
{/if}
