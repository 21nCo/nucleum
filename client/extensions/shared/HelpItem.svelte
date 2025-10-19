<script lang="ts">
  import { hoverable } from "@21n/actions/hover.action";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";

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
    <Icon icon="weblink" size={Size.sm} />
  {/if}
</button>
