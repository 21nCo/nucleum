<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let label: string;
  export let icon: string;
  export let isAwayAction: boolean = false;

  let isHovered: boolean = false;
</script>

<button
  class="flex gap-2 items-center justify-between grow rounded-md h-16 p-3 bg-bgs2 border border-transparent hover:border-brs3 transition-all duration-300 hover:bg-bgs3"
  on:click
  use:hoverable={{
    onHover: (val) => {
      isHovered = val;
    }
  }}
>
  <div class="flex gap-2 items-center">
    <Icon {icon} />
    <div class="text-left">{label}</div>
  </div>
  {#if isAwayAction && isHovered}
    <Icon icon="ph:arrow-up-right-light" size={Size.sm} />
  {/if}
</button>
