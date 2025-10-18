<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";

  export let label: string;
  export let value: number;
  export let icon: string;
</script>

<button
  class="flex items-center gap-1 hover:bg-bgs2 rounded-md px-4 h-full default-typeface"
  on:click
>
  <Icon {icon} size={Size.sm} />
  <span class="flex flex-row gap-1 items-center text-fgs2 text-b2">
    {label}:
    {value}
  </span>
</button>
