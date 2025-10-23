<script lang="ts">
  import Rating from "@21n/components/collection/properties/ratingProperty/Rating.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import EndText from "@21n/components/collection/properties/propertyConfig/EndText.svelte";
  export let avatar: string;
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
