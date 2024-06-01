<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { generateCustomColorShades } from "$lib/client/utils/theme.utils";
  export let type: string = "div";
  export let id: string = "";
  export let color: number | undefined = undefined;
  export let isPreventDefault: boolean = false;
  let classList: string = "";
  export { classList as class };
  $: customColorShades =
    color && !isPreventDefault
      ? generateCustomColorShades($appearance, color)
      : [];
</script>

<svelte:element
  this={type}
  {id}
  class={classList}
  on:click
  style:--customcolor={customColorShades[0]}
  style:--customcolorshadeone={customColorShades[1]}
  style:--customcolorshadetwo={customColorShades[2]}
  style:--customcolorshadethree={customColorShades[3]}
>
  <slot />
</svelte:element>
