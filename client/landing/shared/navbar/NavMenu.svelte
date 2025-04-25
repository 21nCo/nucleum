<script lang="ts">
  import type { ITopNavBar } from "../Landing.types";
  export let topNavBarValues: ITopNavBar;
</script>

{#each topNavBarValues.items as item}
  <a
    class="block text-fgs1 text-b2 2k:text-lb2 hover:text-aps1 hover:bg-bgs2 px-3 py-1 rounded-full"
    target={item.href.startsWith("http") ? "_blank" : "_self"}
    href={item.href}>{item.label}</a
  >
{/each}
