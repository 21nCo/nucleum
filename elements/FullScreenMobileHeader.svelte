<script lang="ts">
  import { appStore } from "../stores/app.store";
  import BackgroundElement from "./style/BackgroundElement.svelte";
</script>

<button
  class="pt-4 pb-6 px-4 flex w-full justify-center -mb-1"
  on:click={() => {
    appStore.hideFullScreenPlayer();
  }}
>
  <BackgroundElement classList="h-1 w-1/3 rounded-full" />
  <!-- <Icon icon="collapse" color="fgs2" /> -->
</button>
