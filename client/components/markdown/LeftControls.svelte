<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { isInEditMode } from "$lib/client/stores/app.store";
  import { getMdStore } from "./markdown.store";
  export let mdId: string;
  const mdStore = getMdStore(mdId);
</script>

<div class="flex gap-0.5 h-10 items-center justify-end">
  {#if $isInEditMode}
    <button on:click class="hover:bg--bgs3 rounded-md">
      <Icon icon="grab" />
    </button>
    <!-- TODO - add nodular style if already nodulated or can be noduable -->
    <!-- {#if $mdStore.params?.isNodular}
      <div class="h-3 w-3 rounded-full border border-dotted border-fgs4"></div>
    {/if} -->
  {/if}
</div>
