<script lang="ts">
  import { page } from "$app/stores";
  import Node from "@21n/products/memotron/node/Node.svelte";
  import { onMount } from "svelte";
  export let id: string = "";
  onMount(() => {
    const sub = page.subscribe((value) => {
      id = value.url.searchParams.get("doc") ?? "";
    });
    return () => {
      sub();
    };
  });
</script>

<div class="bg-bgs1 w-full h-full">
  <Node {id} />
</div>
