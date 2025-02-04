<script lang="ts">
  import A21nLogo from "$lib/client/branding/A21nLogo.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let isComingSoon: boolean = false;
</script>

<div class="flex items-center gap-1.5">
  <span class="-mb-0.5">
    {isComingSoon ? "In works at" : "Built at"}
  </span>

  <a href="https://21n.org" target="_blank">
    <div class="flex items-center gap-2">
      <!-- <BlankLogo size={Size.xs} fill="fgs2" /> -->
      <A21nLogo size={Size.xs} fill="fgs2" />
    </div></a
  >
</div>
