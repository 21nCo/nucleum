<script lang="ts">
  import appearance from "$lib/tidy/stores/appearance.store";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  export let type: string = "div";
  export let id: string = "";
  let classList: string = "";
  /**
   * The index of the parent's background shade. Send 0 to not have any background color.
   */
  export let parentBgIndex: number = 1;
  export { classList as class };
</script>

<svelte:element
  this={type}
  {id}
  class={classList + " " + bgClass($appearance, parentBgIndex)}
  on:click
>
  <slot />
</svelte:element>
