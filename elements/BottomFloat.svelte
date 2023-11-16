<script lang="ts">
  import { windowObject } from "../stores/app.store";
</script>

<div
  class="absolute bottom-0 flex w-full justify-center {$windowObject.isInPortraitMode
    ? 'mb-24'
    : 'mb-4'}"
>
  <slot />
</div>
