<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import {
    resolveIfActiveFgFg,
    retrieveCurrentColors
  } from "$lib/client/utils/theme.utils";
  $: isActiveFgFg = resolveIfActiveFgFg(undefined, $appearance);
  $: currentColors = retrieveCurrentColors($appearance);
</script>

<div
  class="flex w-full h-full"
  style:--fgwhenaccentbg={isActiveFgFg
    ? currentColors.fgs1
    : currentColors.bgs1}
>
  <slot />
  <span class="hidden text-abg"></span>
</div>

<style>
  /* text color for accent bg */
  :global(.text-abg) {
    color: var(--fgwhenaccentbg, rgba(var(--colors-fgs1), 1));
  }
  /* :global(.text-cbg) {
    color: var(--fgwhencustombg, rgba(var(--colors-fgs1), 1));
  } */
</style>
