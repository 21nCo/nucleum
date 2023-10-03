<script lang="ts">
  import type { Item } from "$lib/local/types/item.type";

  export let item: Item;
  export let isActive: boolean = false;
</script>

<button
  on:click
  class="w-full p-2 rounded-md hover:bg-bgs4 flex {isActive ? ' bg-bgs4' : ''}"
>
  {item.label ?? item.name}
</button>
