<script lang="ts">
  import { cubicOut } from "svelte/easing";
  import { fly } from "svelte/transition";
  import Divider from "../elements/Divider.svelte";
  import { Orientation } from "../types/direction.enum";
  import { ColorStrength } from "../types/appearance.type";
  import ResourceResolver from "./paint/ResourceResolver.svelte";
  import { ResourceAccessMode } from "../components/flux/resourceStores/resource.type";
  export let split: string;
</script>

<div
  transition:fly={{ x: 1000, opacity: 0, easing: cubicOut }}
  class="flex h-full flex-grow max-w-1/2 bg-bgs1"
>
  <Divider
    orientation={Orientation.Vertical}
    thickness={2}
    colorStrength={ColorStrength.Strong}
  />
  {#key split}
    <ResourceResolver
      id={split}
      isFromSplitView={true}
      accessMode={ResourceAccessMode.SPLIT}
    />
  {/key}
</div>
