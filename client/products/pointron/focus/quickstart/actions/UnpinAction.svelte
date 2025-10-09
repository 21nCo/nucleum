<script>
  import { tooltip } from "$lib/client/actions/popover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
</script>

<div
  class="absolute flex justify-center items-center w-6 h-6 border border-transparent hover:border-brs3 rounded-full right-0 -top-3 bg-bgs1 hover:bg-bgs2"
  use:tooltip={{
    text: "Unpin from quick focus"
  }}
>
  <Icon icon="minus-circle" size={Size.md} class="fill-ars1" on:click />
</div>
