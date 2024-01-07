<script lang="ts">
  import { appStore } from "$lib/tidy/stores/app.store";
  import { isValidString } from "$lib/tidy/utils/text.utils";
  import BlankLabsFooter from "./BlankLabsFooter.svelte";
  export let isHideAppVersion = false;
  export let isComingSoon: boolean = false;
</script>

<div
  class="flex flex-col justify-center items-center w-full text-fgs3 text-b3 pt-20"
>
  <div class="flex justify-center text-b4">
    {#if !isHideAppVersion}
      {$appStore?.appData?.name ?? ""}
      {" v" + (isValidString($appStore?.appData?.version) ?? "")}
    {/if}
  </div>
  <BlankLabsFooter {isComingSoon} />
</div>
