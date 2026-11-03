<svelte:options runes={true} />

<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import { Size } from "@21n/ui/elements/size.enum";

  let {
    onDone
  }: {
    /** Leaves the resource's edit mode. */
    onDone: () => void;
  } = $props();
</script>

<button
  type="button"
  class="flex items-center gap-1.5 h-8 px-3 mx-1 shrink-0 rounded-md bg-aps1 text-abg text-b2 font-medium hover:brightness-110"
  aria-label="Exit edit mode"
  data-testid="context-zone-edit-done"
  onclick={onDone}
>
  <Icon icon="check" size={Size.sm} class="text-abg stroke-current" />
  Done
</button>
