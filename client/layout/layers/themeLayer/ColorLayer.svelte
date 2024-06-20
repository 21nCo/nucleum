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
</div>

<style>
  /* text color for accent bg */
  :global(.text-abg) {
    color: var(--fgwhenaccentbg, rgba(var(--colors-fgs1), 1));
  }
  :global(.fill-abg) {
    fill: var(--fgwhenaccentbg, rgba(var(--colors-fgs1), 1));
  }
  :global(.stroke-abg) {
    stroke: var(--fgwhenaccentbg, rgba(var(--colors-fgs1), 1));
  }
  :global(.border-abg) {
    border-color: var(--fgwhenaccentbg, rgba(var(--colors-fgs1), 1));
  }
</style>
