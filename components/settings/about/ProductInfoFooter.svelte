<script lang="ts">
  import BlankLogo from "$lib/tidy/branding/BlankLogo.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
</script>

<div
  class="flex flex-col justify-center items-center w-full text-fgs3 text-b3 pt-20"
>
  <div class="flex justify-center text-b4">
    {($appStore.appData?.name ?? "") +
      (" v" + $appStore.appData?.version ?? "")}
  </div>
  <div class="flex gap-2">
    Built at <div class="flex items-center gap-2">
      <BlankLogo size={Size.xs} fill="fgs2" />
      <a href="https://blanklabs.org" target="_blank" class="min-w-fit"
        >Blank labs</a
      >
    </div>
  </div>
</div>
