<script lang="ts">
  export let color: string;
  export let isActive: boolean;
</script>

<button
  class="relative rounded-full w-5 h-5 2k:h-6 2k:w-6 p-1 border-2 border-transparent hover:border-aps1"
  style="background-color: {color};"
  on:click
>
  {#if isActive}
    <span class="display: aboslute;"> ✔️ </span>
  {/if}
</button>
