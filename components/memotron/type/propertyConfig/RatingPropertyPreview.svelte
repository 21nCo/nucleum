<script lang="ts">
  import Rating from "$lib/tidy/elements/rating/Rating.svelte";
  import type { AvatarWithCode, IconAvatar } from "$lib/tidy/types/avatar.type";
  import { InputStyle } from "$lib/tidy/types/input.type";
  import EndText from "./EndText.svelte";
  export let avatar: AvatarWithCode<IconAvatar>;
  export let value: number = 0;
  export let count: number = 5;
  let experimentalCountIncrementor = false;
</script>

<div class="flex items-center justify-between gap-1 h-full w-full">
  <span class="flex items-center gap-1 h-full">
    {#if experimentalCountIncrementor}
      <button
        on:click={() => {
          count = Math.max(3, count - 1);
        }}
        class="flex items-center h-full px-1 py-[0.06rem] rounded-full border border-brs3"
      >
        -
      </button>
    {/if}
    <Rating {avatar} {count} bind:value style={InputStyle.PLAIN} />
  </span>
  {#if experimentalCountIncrementor}
    <button
      on:click={() => {
        count = Math.min(10, count + 1);
      }}
      class="flex items-center h-full px-1 py-[0.06rem] rounded-full border border-brs3"
    >
      +
    </button>
  {/if}
  <EndText text="Preview" />
</div>
