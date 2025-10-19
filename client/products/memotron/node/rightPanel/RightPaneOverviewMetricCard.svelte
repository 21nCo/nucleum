<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";

  export let label: string;
  export let value: number;
  export let icon: string;
</script>

<button
  class="flex items-center gap-1 hover:bg-bgs2 border border-transparent hover:border-brs3 rounded-md px-4 py-1 default-typeface"
  on:click
>
  <Icon {icon} size={Size.sm} />
  <span class="flex flex-row gap-1 items-center text-fgs2 text-b2">
    {label}:
    {value}
  </span>
</button>
