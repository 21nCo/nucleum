<script lang="ts">
  import { appStore, view } from "../stores/app.store";
  export let isAppMenuHidden: boolean = false;
</script>

<div
  class="absolute bottom-0 flex w-full justify-center z-20 {$view.isPortrait &&
  isAppMenuHidden
    ? 'mb-8'
    : $view.isPortrait && $appStore.player
      ? 'mb-[10.5rem]'
      : $view.isPortrait
        ? 'mb-24'
        : 'mb-4'}"
>
  <slot />
</div>
