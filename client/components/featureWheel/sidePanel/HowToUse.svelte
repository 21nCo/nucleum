<script lang="ts">
  import TextCard from "./card/TextCard.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
</script>

<div class="flex flex-col gap-6 dp:gap-8 2k:gap-10">
  <TextCard title="Getting started">
    <div class="flex flex-col gap-4 text-b2">
      <p class="text-fgs2">
        The Wholesome wheel provides an interactive way to explore and compare
        features across different products.
      </p>

      <div class="flex flex-col gap-2">
        <ul class="flex flex-col gap-2">
          <li class="flex items-start gap-2">
            <Icon icon="cursor-click" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Click on any feature on the outer edge of the wheel to view
              detailed information, our rating criteria and comparison.</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="grid" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Click on one or multiple categories to filter by category.</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="sliders" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Pick an app that you want to compare with from the comparision
              dropdown.</span
            >
          </li>
        </ul>
      </div>
    </div>
  </TextCard>

  <TextCard title="Anatomy of the wheel">
    <div class="flex flex-col gap-4 text-b2">
      <div class="flex items-center gap-2 bg-bgs2 rounded-md">
        <p class="text-fgs2">
          Each spoke on the wheel represents a feature. Each spoke is an axis
          starting with -1 at the edge of the circle and 10 at the center. This
          number represents our rating for the feature. You can click on any
          feature to reveal our rating criteria. The rating score is divided
          into three levels represented by concentric divisions.
        </p>
      </div>

      <div class="flex flex-col gap-2 mt-1">
        <div class="flex items-center gap-2 text-fgs2">
          <div class="w-3 h-3 rounded-full bg-ags1"></div>
          <span>Inner circle: Great rating (6 to 10)</span>
        </div>
        <div class="flex items-center gap-2 text-fgs2">
          <div class="w-3 h-3 rounded-full bg-ass1"></div>
          <span>Middle circle: Okay rating (0 to 6)</span>
        </div>
        <div class="flex items-center gap-2 text-fgs2">
          <div class="w-3 h-3 rounded-full bg-ars1"></div>
          <span>Outer circle: Negative rating (-1 to 0)</span>
        </div>
      </div>
    </div>
  </TextCard>

  <TextCard title="Comparision reports">
    <div class="flex flex-col gap-4 text-b2">
      <p class="text-fgs2">
        Generate detailed comparison with any app by selecting the apps to
        compare. Max 3 at a time is allowed.
      </p>

      <div class="flex flex-col gap-2">
        <h3 class="text-b2 font-medium text-fgs1">How to Compare</h3>
        <ul class="flex flex-col gap-2">
          <li class="flex items-start gap-2">
            <Icon icon="cursor-click" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Select competitors you want to compare using the dropdown on the
              left.</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="table" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >View the generated comparison table showing feature differences
              by clicking on "See report".</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="tag" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Look for the "Planned" badge to see upcoming features</span
            >
          </li>
        </ul>
      </div>
    </div>
  </TextCard>
</div>
