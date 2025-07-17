<script lang="ts">
  import type { IButton } from "../landing.type";
  import Button from "../elements/Button.svelte";
  export let cta: IButton[] = [];
</script>

{#if cta.length > 0}
  <div class="flex gap-3 items-center">
    {#each cta as ctaItem}
      <Button
        label={ctaItem.label}
        isShort={true}
        icon={ctaItem.icon}
        type={ctaItem.type}
        href={ctaItem.href ?? ""}
      />
    {/each}
  </div>
{/if}
