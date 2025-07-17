<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import Button from "../elements/Button.svelte";
  import type { ITestimonial } from "../landing.type";
  import { landing, org } from "../store/shared.store";
  import Title from "../Title.svelte";
  import TestimonialItem from "./TestimonialItem.svelte";
  import TestimonialRow from "./TestimonialRow.svelte";
  export let title: string = "Testimonials";
  export let subtitle: string = "What our users are saying";
  export let testimonials: ITestimonial[] = [];
  export let discord: string = org.discord;
  export let twitter: string = $landing.urls.socials?.twitter ?? org.twitter;
</script>

<div class="w-full flex flex-col gap-20 mo:gap-10 overflow--x-hidden relative">
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
      <!-- <TestimonialRow
        testimonials={testimonials.slice(10, 15)}
        transitionDirection="left"
      /> -->
    </div>
  {/if}
  <div class="flex flex-wrap justify-center items-center gap-4">
    <Button
      label="Join our Discord"
      type="secondary"
      icon="discord"
      href={discord}
    />
    <Button
      label="Follow us on X"
      type="secondary"
      icon="twitter"
      href={twitter}
    />
  </div>
  <div
    class="mo:hidden w-20 bg-gradient-to-r from-bgs2/20 to-bgs2 absolute right-0 top-0 h-full"
  ></div>
  <div
    class="mo:hidden w-20 bg-gradient-to-l from-bgs2/20 to-bgs2 absolute left-0 top-0 h-full"
  ></div>
</div>
