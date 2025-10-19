<script lang="ts">
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import Divider from "@21n/elements/Divider.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import { ColorStrength } from "@21n/types/appearance.type";
  import ResourceResolver from "@21n/layout/paint/ResourceResolver.svelte";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  export let split: string;
  export let accessMode: ResourceAccessMode = ResourceAccessMode.SPLIT;
</script>

<div
  transition:fly={{ x: 1000, opacity: 0, easing: cubicOut }}
  class="flex h-full flex-1 min-w-0 max-w-1/3 bg-bgs1"
>
  <Divider
    orientation={Orientation.Vertical}
    thickness={2}
    colorStrength={ColorStrength.Strong}
  />
  {#key split}
    <ResourceResolver id={split} isFromSplitView={true} {accessMode} />
  {/key}
</div>
