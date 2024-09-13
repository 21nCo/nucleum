<script lang="ts">
  import WebClipPreview from "$lib/client/products/memotron/node/content/web/WebClipPreview.svelte";
  import type { ITextClip } from "$lib/client/products/memotron/node/node.type";
  export let clip: ITextClip;
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
  <WebClipPreview node={clip} />
</div>
