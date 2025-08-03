<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  export let icon: string;
  export let label: string;
  export let isBoxed: boolean = false;
</script>

<button
  class={cn("relative flex flex-col items-center justify-center gap-2 h-24", {
    "notouch:hover:bg-bgs2 active:bg-bgs2 bg-bgs1": isBoxed,
    "p-3 bg-bgs1 rounded-md": !isBoxed
  })}
  on:click
>
  <Icon {icon} size={Size.lg} class="text-fgs2" />
  <span class="text-fgs2 text-b3 line-clamp-1">{label}</span>
</button>
