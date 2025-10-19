<script lang="ts">
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import WebClipPreview from "@21n/products/memotron/node/content/web/WebClipPreview.svelte";
  import type { ITextClip } from "@21n/products/memotron/node/node.type";
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
    accessPoint={ResourceAccessPoint.CLIPPER}
  />
</div>
