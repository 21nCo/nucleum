<script lang="ts">
  import type { IListItem } from "../Landing.types";

  export let title: string;
  export let items: IListItem[];
</script>

<div class="flex flex-col gap-4">
  <p class="text-fgs3 text-base underline font-normal leading-[22px]">
    {title}
  </p>
  {#each items as item}
    <a
      class="block text-fgs1 text-[20px] font-medium leading-[28px] hover:text-aps1"
      href={item.href}>{item.title}</a
    >
  {/each}
</div>
