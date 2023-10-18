<script lang="ts">
  import BreadcrumbItem from "./BreadcrumbItem.svelte";
  import type { BreadcrumbItem as BreadcrumbItemType } from "$lib/tidy/types/breadcrumbItem.type";

  export let containerClassList: string = "";
  export let containerStyle: string = "";
  export let items: BreadcrumbItemType[] = [];
</script>

<div
  style={containerStyle}
  class={`flex w-full overflow-auto remove-scrollbar ${containerClassList}`}
>
  {#each items as item}
    <BreadcrumbItem {...item} />
  {/each}
</div>
