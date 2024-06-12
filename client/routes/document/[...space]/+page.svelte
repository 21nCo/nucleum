<script lang="ts">
  import SpaceDocument from "$lib/client/components/space/SpaceDocument.svelte";

  import { onMount } from "svelte";
  let spaceId: string = "";
  let documentId: string = "";
  onMount(() => {
    const path = window.location.pathname.split("/");
    spaceId = path[2];
    documentId = path[3];
  });
</script>

<SpaceDocument {spaceId} {documentId} />
