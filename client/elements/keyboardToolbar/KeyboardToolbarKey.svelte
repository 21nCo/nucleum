<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  export let icon: string;
</script>

<button
  class="flex items-center justify-center bg-white dark:bg-[#6b6b6b] rounded-md p-1 h-[43px] w-[37px] click:bg-fgs4 shadow-sm"
  on:click
  on:mousedown={(e) => {
    e.preventDefault();
    e.stopPropagation();
  }}
>
  <Icon {icon} size={Size.sm} />
</button>
