<script lang="ts">
  import { onMount } from "svelte";
  import Divider from "../elements/Divider.svelte";
  import { Orientation } from "../types/direction.enum";
  import ResourceResolver from "./paint/ResourceResolver.svelte";
  import { page } from "$app/stores";
  import { fly, slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  let split: string | undefined = undefined;
  onMount(() => {
    const sub = page.subscribe((value) => {
      split = value.url.searchParams.get("split") ?? undefined;
    });
    return () => {
      sub();
    };
  });
</script>

<div class="flex w-full h-full">
  <div class="flex h-full {split ? 'w-1/2' : 'w-full'}">
    <slot name="main" />
  </div>
  {#if split}
    <div
      transition:fly={{ x: 1000, opacity: 0, easing: cubicOut }}
      class="flex h-full grow"
    >
      <Divider orientation={Orientation.Vertical} />
      <ResourceResolver id={split} isFromSplitView={true} />
    </div>
  {/if}
</div>
