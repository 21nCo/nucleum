<script lang="ts">
  import BlankLogo from "$lib/tidy/branding/BlankLogo.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  export let isComingSoon = false;
</script>

<div
  class="flex flex-col justify-center items-center w-full text-fgs3 text-b3 pt-20"
>
  <div class="flex justify-center text-b4">
    {#if !isComingSoon}
      {$appStore.appData?.name ?? ""}
      {" v" + $appStore.appData?.version ?? ""}
    {/if}
  </div>
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
</div>
