<script lang="ts">
  import BlankLogo from "$lib/tidy/branding/BlankLogo.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  export let isComingSoon: boolean = false;
</script>

<div class="flex gap-2">
  {isComingSoon ? "In works at" : "Built at"}<a
    href="https://blanklabs.org"
    target="_blank"
  >
    <div class="flex items-center gap-2">
      <BlankLogo size={Size.xs} fill="fgs2" />
      <div class="min-w-fit">Blank labs</div>
    </div></a
  >
</div>
