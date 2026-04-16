<script lang="ts">
  import type { IButton } from "@21n/landing/shared/landing.type";
  import Button from "@21n/landing/shared/elements/Button.svelte";
  let {
    cta = [],
  }: {
    cta?: IButton[];
  } = $props();
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
