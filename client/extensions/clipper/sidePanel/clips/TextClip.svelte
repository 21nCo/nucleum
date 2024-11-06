<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import WebClipPreview from "$lib/client/products/memotron/node/content/web/WebClipPreview.svelte";
  import type { ITextClip } from "$lib/client/products/memotron/node/node.type";
  export let clip: ITextClip;
  export let id: string = "";
</script>

<div
  {id}
  class="rounded-md text-b2"
  role="button"
  tabindex="0"
  on:click
  on:keydown
  style="cursor: pointer;"
>
  <WebClipPreview
    node={clip}
    truncateLength={200}
    accessPoint={ResourceAccessPoint.BROWSER}
  />
</div>
