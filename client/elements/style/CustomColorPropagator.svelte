<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import {
    generateCustomColorShades,
    resolveIfActiveFgFg,
    retrieveCurrentColors
  } from "$lib/client/utils/theme.utils";
  export let type: string = "div";
  export let id: string = "";
  export let color: number | undefined = undefined;
  let classList: string = "w-full h-full";
  let styles: string = "";
  export { classList as class };
  export { styles as style };
  $: customColorShades =
    color != undefined ? generateCustomColorShades($appearance, color) : [];
  $: isActiveFgFg = resolveIfActiveFgFg(color, $appearance);
  $: currentColors = retrieveCurrentColors($appearance);
</script>

<svelte:element
  this={type}
  {id}
  class={classList}
  on:click
  style:--customcolor={customColorShades[0]}
  style:--customcolorshadetwo={customColorShades[1]}
  style:--customcolorshadethree={customColorShades[2]}
  style:--customcolorshadefour={customColorShades[3]}
  style:--customcolorshadefive={customColorShades[4]}
  style:--fgwhencustombg={isActiveFgFg
    ? currentColors.fgs1
    : currentColors.bgs1}
  style={styles}
>
  <slot />
</svelte:element>

<style>
  :global(.fill-cbg) {
    fill: var(--fgwhencustombg, var(--fgwhenaccentbg));
  }
  :global(.stroke-cbg) {
    stroke: var(--fgwhencustombg, var(--fgwhenaccentbg));
  }
  :global(.text-cbg) {
    color: var(--fgwhencustombg, var(--fgwhenaccentbg));
  }
  :global(.border-cbg) {
    border-color: var(--fgwhencustombg, var(--fgwhenaccentbg));
  }
  :global(.bg-ccs1) {
    background-color: var(--customcolor, rgba(var(--colors-aps1), 1));
    color: var(--fgwhencustombg, var(--fgwhenaccentbg));
  }
  :global(.bg-ccs2) {
    background-color: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.bg-ccs3) {
    background-color: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.bg-ccs4) {
    background-color: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.bg-ccs5) {
    background-color: var(--customcolorshadefive, rgba(var(--colors-aps4), 1));
  }
  :global(.border-ccs1) {
    border-color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.border-ccs2) {
    border-color: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.border-ccs3) {
    border-color: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.border-ccs4) {
    border-color: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.text-ccs1) {
    color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.text-ccs2) {
    color: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.text-ccs3) {
    color: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.text-ccs4) {
    color: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.fill-ccs1) {
    fill: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.stroke-ccs1) {
    stroke: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.transition-ease) {
    transition: background-color 0.3s ease-in-out;
  }

  :global(.hover\:bg-ccs1:hover) {
    background-color: var(--customcolor, rgba(var(--colors-aps1), 1));
    color: var(--fgwhencustombg, var(--fgwhenaccentbg));
  }
  :global(.hover\:bg-ccs2:hover) {
    background-color: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.hover\:bg-ccs3:hover) {
    background-color: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.hover\:bg-ccs4:hover) {
    background-color: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.hover\:bg-ccs5:hover) {
    background-color: var(--customcolorshadefive, rgba(var(--colors-aps4), 1));
  }
  :global(.hover\:border-ccs1:hover) {
    border-color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.hover\:border-ccs2:hover) {
    border-color: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.hover\:border-ccs3:hover) {
    border-color: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.hover\:border-ccs4:hover) {
    border-color: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.hover\:text-ccs1:hover) {
    color: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.hover\:text-ccs2:hover) {
    color: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.hover\:text-ccs3:hover) {
    color: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.hover\:text-ccs4:hover) {
    color: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.hover\:fill-ccs1:hover) {
    fill: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.hover\:stroke-ccs1:hover) {
    stroke: var(--customcolor, rgba(var(--colors-aps1), 1));
  }

  :global(.to-ccs1) {
    --tw-gradient-to: var(--customcolor, rgba(var(--colors-aps1), 1));
  }
  :global(.to-ccs2) {
    --tw-gradient-to: var(--customcolorshadetwo, rgba(var(--colors-aps2), 1));
  }
  :global(.to-ccs3) {
    --tw-gradient-to: var(--customcolorshadethree, rgba(var(--colors-aps3), 1));
  }
  :global(.to-ccs4) {
    --tw-gradient-to: var(--customcolorshadefour, rgba(var(--colors-aps4), 1));
  }
  :global(.to-ccs5) {
    --tw-gradient-to: var(--customcolorshadefive, rgba(var(--colors-aps5), 1));
  }

  :global(.\!bg-ccs1) {
    background-color: var(
      --customcolor,
      rgba(var(--colors-aps1), 1)
    ) !important;
    color: var(--fgwhencustombg, var(--fgwhenaccentbg)) !important;
  }
  :global(.\!border-ccs1) {
    border-color: var(--customcolor, rgba(var(--colors-aps1), 1)) !important;
  }
</style>
