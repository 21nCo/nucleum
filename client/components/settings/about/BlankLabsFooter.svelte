<svelte:options runes={true} />

<script lang="ts">
  import A21nLogo from "@21n/branding/A21nLogo.svelte";
  import { Size } from "@21n/types/size.enum";
  let { isComingSoon = false }: { isComingSoon?: boolean } = $props();
</script>

<div class="flex items-center gap-1.5">
  <span class="-mb-0.5">
    {isComingSoon ? "In works at" : "Built at"}
  </span>

  <a href="https://21n.org" target="_blank" rel="noopener noreferrer">
    <div class="flex items-center gap-2">
      <A21nLogo size={Size.xs} fill="fgs2" />
    </div></a
  >
</div>
