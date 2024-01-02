<script lang="ts">
  import { appStore, userPreferences } from "../stores/app.store";
  import { bgClass } from "../utils/theme.utils";
</script>

<button
  class="pt-4 pb-6 px-4 flex w-full justify-center -mb-1"
  on:click={() => {
    appStore.hideFullScreenPlayer();
  }}
>
  <div class="h-1 w-1/3 rounded-full {bgClass($userPreferences.theme, 1)}" />
  <!-- <Icon icon="collapse" color="fgs2" /> -->
</button>
