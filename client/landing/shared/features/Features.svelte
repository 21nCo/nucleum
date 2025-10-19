<script lang="ts">
  import { cn } from "@21n/utils/ui.utils";
  import type { IFeature } from "@21n/landing/shared/landing.type";
  import Title from "@21n/landing/shared/Title.svelte";
  import FeatureItem from "@21n/landing/shared/features/FeatureItem.svelte";
  export let title: string = "";
  export let subtitle: string = "";
  export let features: IFeature[] = [];
</script>

<section class={cn("w-full flex flex-col gap-20 mo:gap-10")}>
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
</section>
