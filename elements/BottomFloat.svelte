<script lang="ts">
  import { appStore, windowObject } from "../stores/app.store";
  export let isAppMenuHidden: boolean = false;
</script>

<div
  class="absolute bottom-0 flex w-full justify-center z-20 {$windowObject.isInPortraitMode &&
  isAppMenuHidden
    ? 'mb-8'
    : $windowObject.isInPortraitMode && $appStore.player
      ? 'mb-[10.5rem]'
      : $windowObject.isInPortraitMode
        ? 'mb-24'
        : 'mb-4'}"
>
  <slot />
</div>
