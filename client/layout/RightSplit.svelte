<script lang="ts">
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import ResourceResolver from "@21n/layout/paint/ResourceResolver.svelte";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  export let split: string;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.SPLIT;
</script>

<div
  transition:fly={{ x: 1000, opacity: 0, easing: cubicOut }}
  class="flex h-full flex-1 min-w-0 max-w-1/3 bg-bgs1"
>
  <div class="w-1 bg-bgs2-striped border-x border-brs2"></div>
  {#key split}
    <ResourceResolver id={split} isFromSplitView={true} {accessMode} />
  {/key}
</div>
