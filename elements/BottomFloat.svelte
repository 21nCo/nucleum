<script lang="ts">
  import { windowObject } from "../stores/app.store";
  export let isAppMenuHidden: boolean = false;
</script>

<div
  class="absolute bottom-0 flex w-full justify-center {$windowObject.isInPortraitMode &&
  isAppMenuHidden
    ? 'mb-8'
    : $windowObject.isInPortraitMode
    ? 'mb-24'
    : 'mb-4'}"
>
  <slot />
</div>
