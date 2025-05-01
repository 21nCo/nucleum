<script lang="ts">
  import type { IListItem } from "../../landing.type";
  import List from "../../list/List.svelte";
  export let items: IListItem[];
  export let slice: number = 4;
  export let color: "aps1" | "ags1" = "ags1";
</script>

<div class="flex gap-x-20 gap-y-2 flex-wrap w-full text-{color}">
  <div>
    <List items={items.slice(0, slice)} />
  </div>
  <div>
    <List items={items.slice(slice)} />
  </div>
</div>
