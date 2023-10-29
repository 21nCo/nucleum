<script lang="ts">
  import type { DbRecordWithLabel } from "$lib/tidy/types/dbrecord.type";
  export let item: DbRecordWithLabel;
  export let isActive: boolean = false;
</script>

<button
  on:click
  class="w-full p-2 rounded-md hover:bg-bgs4 flex {isActive ? ' bg-bgs4' : ''}"
>
  {item.label ?? ("name" in item ? item.name : "")}
</button>
