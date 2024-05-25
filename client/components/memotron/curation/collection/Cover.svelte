<script lang="ts">
  import { isInEditMode } from "$lib/client/stores/app.store";

  export let src: string;
</script>

{#if src}
  <div
    class="bg-bgs2 h-40 w-full flex justify-center items-center text-fgs4 text-b3"
  >
    Cover
  </div>
{:else if $isInEditMode}
  <div
    class="bg-bgs2 h-20 w-full flex justify-center items-center text-fgs4 text-b3"
  >
    + Add cover photo
  </div>
{/if}
