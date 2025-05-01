<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IFeature } from "../landing.type";
  import Title from "../Title.svelte";
  import FeatureItem from "./FeatureItem.svelte";
  export let title: string = "";
  export let subtitle: string = "";
  export let features: IFeature[] = [];
</script>

<div class={cn("w-full flex flex-col gap-20 mo:gap-10")}>
  <div class="flex flex-col justify-center items-center">
    <Title {title} {subtitle} />
  </div>
  <div class="flex flex-col gap-32 mo:gap-20 w-full">
    {#each features as feature, i}
      <div>
        <FeatureItem {feature} isReversed={i % 2 !== 0} />
      </div>
    {/each}
  </div>
</div>
