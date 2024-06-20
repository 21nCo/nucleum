<script lang="ts">
  import { resolveResource } from "$lib/client/products/memotron/memotron.store";
  import { appStore } from "$lib/client/stores/app.store";
  import { ResourceAccessMode } from "$lib/client/types/action.type";
  import { onMount } from "svelte";
  export let id: string;
  let resource: any;
  onMount(async () => {
    resource = await resolveResource(id);
  });
</script>

<button
  {id}
  contenteditable="false"
  class="mention inline-block hover:bg-bgs3 px-1 rounded-md text-ass1"
  on:click|stopPropagation={(e) =>
    appStore.resourceClickHandler(e, id, ResourceAccessMode.POP)}
>
  {resource?.label ?? resource?.body}
</button>
