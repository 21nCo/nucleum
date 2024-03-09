<script lang="ts">
  import { onMount } from "svelte";
  import { splitView } from "../stores/app.store";
  import { isValidArrayWithData } from "../utils/obj.utils";
  import Divider from "../elements/Divider.svelte";
  import { Orientation } from "../types/direction.enum";
  import ResourceResolver from "./paint/ResourceResolver.svelte";
  export let id: string;
  export let split: string | undefined = undefined;
  onMount(() => {
    const splitSub = splitView.subscribe((value) => {
      if (!isValidArrayWithData(value)) return;
      id = value[0];
      split = value[1];
    });
    return () => splitSub();
  });
</script>

<div class="flex w-full h-full">
  <div class="flex h-full {split ? 'w-1/2' : 'w-full'}">
    <ResourceResolver {id} isFromSplitView={true} />
  </div>
  {#if split}
    <Divider orientation={Orientation.Vertical} />
    <ResourceResolver id={split} isFromSplitView={true} />
  {/if}
</div>
