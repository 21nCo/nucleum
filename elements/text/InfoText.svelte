<script lang="ts">
  export let info: string;
  let isHovered: boolean = false;
</script>

<div
  class="relative rounded-full w-4 h-4 border-2 border-fgs3 flex justify-center items-center text-b3 text-fgs3 cursor-pointer"
  on:mouseenter={() => (isHovered = true)}
  on:mouseleave={() => (isHovered = false)}
>
  i
  {#if isHovered}
    <div
    class="absolute text-b2 text-fgs2 bg-bgs4 rounded-md p-4 z-30"
    style="right: -21rem; position:sticky;"
    >
      {info}
    </div>
  {/if}
</div>
