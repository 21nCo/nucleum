<script lang="ts">
  import { onMount } from "svelte";
  import ResourceResolver from "./paint/ResourceResolver.svelte";
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "../types/action.type";
  import RightSplit from "./RightSplit.svelte";
  export let id: string;
  let split: string | undefined = undefined;
  export let componentParams: any = {};
  onMount(() => {
    const sub = page.subscribe((value) => {
      split =
        value.url.searchParams.get(ResourceAccessMode.FSPLIT) ?? undefined;
    });
    return () => {
      sub();
    };
  });
</script>

<div class="flex w-full h-full">
  <div class="flex h-full {split ? 'w-1/2' : 'w-full'}">
    <slot>
      <ResourceResolver
        {id}
        componentParams={{ ...componentParams, isFromSplitView: true }}
      />
    </slot>
  </div>
  {#if split}
    <RightSplit {split} />
  {/if}
</div>
