<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ITestimonial } from "../Landing.types";
  import Title from "../Title.svelte";
  import TestimonialItem from "./TestimonialItem.svelte";
  import TestimonialRow from "./TestimonialRow.svelte";
  export let title: string = "Testimonials";
  export let subtitle: string = "What our users are saying";
  export let testimonials: ITestimonial[] = [];
</script>

<div class="w-full flex flex-col gap-20 mo:gap-10 overflow-x-hidden relative">
  <div class="flex flex-col justify-center items-center">
    <Title {title} {subtitle} />
  </div>
  {#if $view.isConstrainedWidth}
    <div class="flex flex-col gap-6 w-full">
      {#each testimonials as testimonial, i}
        <div>
          <TestimonialItem {testimonial} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex flex-col gap-6 w-full">
      <TestimonialRow
        testimonials={testimonials.slice(0, 5)}
        transitionDirection="left"
      />
      <TestimonialRow
        testimonials={testimonials.slice(5, 10)}
        transitionDirection="right"
      />
    </div>
  {/if}
  <div
    class="w-20 bg-gradient-to-r from-bgs2/20 to-bgs2 absolute right-0 top-0 h-full"
  ></div>
  <div
    class="w-20 bg-gradient-to-l from-bgs2/20 to-bgs2 absolute left-0 top-0 h-full"
  ></div>
</div>
