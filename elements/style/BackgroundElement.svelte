<script lang="ts">
  import appearance from "$lib/tidy/stores/appearance.store";
  import { bgClass } from "$lib/tidy/utils/theme.utils";
  export let classList: string = "";
  /**
   * The index of the parent's background shade. Send 0 to not have any background color.
   */
  export let parentBgIndex: number = 1;
</script>

<div class={classList + " " + bgClass($appearance, parentBgIndex)}>
  <slot />
</div>
