<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import AccountLayout from "@21n/components/account/AccountLayout.svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<AccountLayout>
  {@render children?.()}
</AccountLayout>
