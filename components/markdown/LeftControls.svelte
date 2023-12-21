<script lang="ts">
  let isHovering = true;
</script>

<div
  class="flex flex-col justify-center items-center bg-bgs1 h-10 w-10 rounded-full"
  on:pointerenter={() => {
    isHovering = true;
  }}
  on:pointerleave={() => {
    isHovering = false;
  }}
>
  {#if isHovering}
    <div class=" text-fgs3 h-2 w-2 m-4 rounded-full bg-fgs4"></div>
  {/if}
</div>
