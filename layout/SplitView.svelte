<script lang="ts">
  import ComponentResolver from "$lib/tidy/layout/paint/ComponentResolver.svelte";
  import { onMount } from "svelte";
  import { splitView } from "../stores/app.store";
  import { isValidArrayWithData } from "../utils/obj.utils";
  import Divider from "../elements/Divider.svelte";
  import { Orientation } from "../types/direction.enum";
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
    <ComponentResolver
      path={id.split(":")[0]}
      params={{ id, isFromSplitView: true }}
    />
  </div>
  {#if split}
    <Divider orientation={Orientation.Vertical} />
    <ComponentResolver
      path={split.split(":")[0]}
      params={{ id: split, isFromSplitView: true }}
    />
  {/if}
</div>
