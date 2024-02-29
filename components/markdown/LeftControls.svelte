<script lang="ts">
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { isInEditMode } from "$lib/tidy/stores/app.store";
  import { MdContext } from "$lib/tidy/types/md.type";
  import { getMdStore } from "./markdown.store";
  export let mdId: string;
  const mdStore = getMdStore(mdId);
</script>

<div class="flex gap-0.5 h-10 items-center justify-end">
  {#if $isInEditMode}
    <button on:click class="hover:bg-bgs3 rounded-md">
      <Icon icon="grab" />
    </button>
    {#if $mdStore.context === MdContext.NODE}
      <div class="h-3 w-3 rounded-full border border-dotted border-fgs4"></div>
    {/if}
  {/if}
</div>
