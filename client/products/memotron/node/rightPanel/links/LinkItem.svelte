<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceThumbnailTitle from "../../../common/thumbnail/ResourceThumbnailTitle.svelte";
  import type { INode } from "../../node.type";
  export let item: INode;
</script>

<button
  class={cn(
    "flex w-full p-3 border rounded-md truncate bg-bgs2 border-brs3 hover:border-aps2",
    {}
  )}
  on:click
>
  <!-- TODO - add parent breadcrumbs  and avatar in below component - moving from LinkSuggestionItem.svelte -->
  <ResourceThumbnailTitle {item} />
</button>
