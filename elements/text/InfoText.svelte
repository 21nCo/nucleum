<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import Icon from "../Icon.svelte";

  export let info: string;
  let isHovered: boolean = false;
</script>

<div
  class="relative rounded-full w-4 h-4 flex justify-center items-center text-b3 text-fgs3 cursor-pointer"
  on:mouseenter={() => (isHovered = true)}
  on:mouseleave={() => (isHovered = false)}
>
  <Icon icon="info" size={Size.sm} />
  {#if isHovered}
    <div
      class="absolute left-full text-b2 text-fgs2 bg-bgs3 rounded-md p-4 z-30 min-w-[15rem]"
    >
      {info}
    </div>
  {/if}
</div>
