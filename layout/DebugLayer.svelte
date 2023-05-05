<script lang="ts">
  import { appStore, windowObject } from "$lib/tidy/stores/app.store";
</script>

<div
  class="absolute debug bottom-40 right-0 flex flex-col p-10 bg-bgs4 bg-opacity-60 text-fgs1 rounded-lg z-20"
>
  <div>
    {"Dimensions (W x H): " +
      $windowObject.documentWidth +
      "x" +
      $windowObject.documentHeight}
  </div>
  <div>
    {"Landscapiness: " + $windowObject.landscapiness.toFixed(2)}
  </div>
  <div>
    {"Is in thin mode: " + $windowObject.isInThinMode}
  </div>
  <div>
    {"Scale: " + $windowObject.scale.toFixed(2)}
  </div>
  <div>
    {"Theme: " + $appStore.tailwindTheme}
  </div>
</div>
