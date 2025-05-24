<script lang="ts">
  import TextCard from "./card/TextCard.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
</script>

<div class="flex flex-col gap-6 dp:gap-8 2k:gap-10">
  <TextCard title="Understanding the Feature Wheel">
    <div class="flex flex-col gap-4 text-b2">
      <p class="text-fgs2">
        The Wholesome wheel provides an interactive way to explore and compare
        features across different products.
      </p>

      <div class="flex flex-col gap-2 mt-2">
        <h3 class="text-b2 font-medium text-fgs1">Getting Started</h3>
        <ul class="flex flex-col gap-2">
          <li class="flex items-start gap-2">
            <Icon
              icon="ph:cursor-click"
              class="text-aps1 mt-0.5"
              size={Size.sm}
            />
            <span class="text-fgs2"
              >Click on any feature on the wheel to view detailed information
              and comparison</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon
              icon="ph:squares-four"
              class="text-aps1 mt-0.5"
              size={Size.sm}
            />
            <span class="text-fgs2"
              >Click on one or multiple categories to filter by category</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="ph:sliders" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Pick an app that you want to compare with from the list</span
            >
          </li>
        </ul>
      </div>
    </div>
  </TextCard>

  <TextCard title="One on one comparison">
    <div class="flex flex-col gap-4 text-b2">
      <p class="text-fgs2">
        Generate detailed comparison between Memotron and any other app, click
        on "See report" to view the comparison
      </p>

      <div class="flex flex-col gap-2">
        <h3 class="text-b2 font-medium text-fgs1">How to Compare</h3>
        <ul class="flex flex-col gap-2">
          <li class="flex items-start gap-2">
            <Icon
              icon="ph:cursor-click"
              class="text-aps1 mt-0.5"
              size={Size.sm}
            />
            <span class="text-fgs2"
              >Select competitors you want to compare with using the dropdown on
              the left</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="ph:table" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >View the generated comparison table showing feature differences</span
            >
          </li>
          <li class="flex items-start gap-2">
            <Icon icon="ph:tag" class="text-aps1 mt-0.5" size={Size.sm} />
            <span class="text-fgs2"
              >Look for the "Planned" badge to see upcoming features</span
            >
          </li>
        </ul>
      </div>
    </div>
  </TextCard>

  <TextCard title="Feature rating">
    <div class="flex flex-col gap-4 text-b2">
      <div class="flex items-center gap-2 bg-bgs2 rounded-md">
        <p class="text-fgs2">
          Click on any feature to see detailed information about what it offers,
          our rating criteria, and how it compares to alternatives.
        </p>
      </div>

      <div class="flex flex-col gap-2 mt-1">
        <div class="flex items-center gap-2 text-fgs2">
          <div class="w-3 h-3 rounded-full bg-ags1"></div>
          <span>Great</span>
        </div>
        <div class="flex items-center gap-2 text-fgs2">
          <div class="w-3 h-3 rounded-full bg-ass1"></div>
          <span>Okay</span>
        </div>
        <div class="flex items-center gap-2 text-fgs2">
          <div class="w-3 h-3 rounded-full bg-ars1"></div>
          <span>Negative</span>
        </div>
        <div class="flex items-center gap-2 text-fgs2">
          <div
            class="w-3 h-3 rounded-full bg-bgs3 border border-dashed border-fgs3"
          ></div>
          <span>Not Available</span>
        </div>
      </div>
    </div>
  </TextCard>
</div>
