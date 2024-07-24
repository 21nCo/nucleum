<script lang="ts">
  import type {
    Clip,
    TextHighlightContent
  } from "$lib/client/products/memotron/common/clip.type";
  export let clip: Clip<TextHighlightContent>;
  export let id: string = "";
</script>

<div
  {id}
  class="bg-bgs2 rounded-md p-2 text-b2"
  role="button"
  tabindex="0"
  on:click
  on:keydown
  style="cursor: pointer;"
>
  <!-- TODO - Use clip thumbnail from memotron lib -->
  {clip.body.text}
</div>
