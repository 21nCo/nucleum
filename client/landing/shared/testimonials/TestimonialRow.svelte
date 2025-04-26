<script lang="ts">
  import type { ITestimonial } from "../Landing.types";
  import TestimonialItem from "./TestimonialItem.svelte";
  import { onMount, onDestroy } from "svelte";

  export let testimonials: ITestimonial[] = [];
  export let transitionDirection: "left" | "right" = "left";

  let animationContainer: HTMLElement;
  let animationActive = false;
  let animationSpeed = 40; // pixels per second (adjust as needed)
  let lastTimestamp: number;
  let animationFrameId: number;

  function animate(timestamp: number) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const elapsed = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (animationActive && animationContainer) {
      // Calculate movement based on elapsed time and direction
      const pixelsToMove = (elapsed / 1000) * animationSpeed;
      const movement =
        transitionDirection === "left" ? -pixelsToMove : pixelsToMove;

      // Get dimensions
      const itemWidth = animationContainer.firstElementChild?.clientWidth || 0;
      const gapWidth = 24; // 6 * 4px (gap-6 = 1.5rem = 24px)
      const singleItemTotalWidth = itemWidth + gapWidth;

      // Current position
      const currentPosition = parseFloat(
        animationContainer.style.transform.replace(/[^\d.-]/g, "") || "0"
      );
      let newPosition = currentPosition + movement;

      // Special handling for right-to-left animation to avoid gaps
      if (transitionDirection === "right" && newPosition > 0) {
        // For right direction, we need to pre-emptively move the last item to the beginning
        // before it becomes visible (showing a gap)
        const lastChild = animationContainer.lastElementChild;
        if (lastChild) {
          // Remove transition temporarily to avoid visual glitch
          animationContainer.style.transition = "none";
          // Move last item to front
          animationContainer.insertBefore(
            lastChild,
            animationContainer.firstElementChild
          );
          // Adjust position to compensate for the moved item
          newPosition = newPosition - singleItemTotalWidth;
          animationContainer.style.transform = `translateX(${newPosition}px)`;
          // Force reflow
          void animationContainer.offsetHeight;
          // Restore transition
          animationContainer.style.transition = "";
        }
      } else {
        // Apply the transform for normal movement
        animationContainer.style.transform = `translateX(${newPosition}px)`;
      }

      // Check if we need to loop the animation for left-to-right
      if (
        transitionDirection === "left" &&
        Math.abs(newPosition) >= singleItemTotalWidth
      ) {
        // Move the first item to the end
        const firstChild = animationContainer.firstElementChild;
        if (firstChild) {
          animationContainer.appendChild(firstChild);
        }
        // Reset position to create illusion of infinite scroll
        animationContainer.style.transform = `translateX(${newPosition + singleItemTotalWidth}px)`;
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  onMount(() => {
    // If direction is right, we need to prepare the container
    if (transitionDirection === "right") {
      // Move some items from the end to the beginning to start with correct items in view
      for (let i = 0; i < Math.min(4, testimonials.length); i++) {
        if (animationContainer && animationContainer.lastElementChild) {
          animationContainer.insertBefore(
            animationContainer.lastElementChild,
            animationContainer.firstElementChild
          );
        }
      }
      // Start with a negative offset so items appear in the right position
      const itemWidth = animationContainer.firstElementChild?.clientWidth || 0;
      const gapWidth = 24; // gap-6
      const offset = -(itemWidth + gapWidth) * 3; // Offset by 3 items
      animationContainer.style.transform = `translateX(${offset}px)`;
    }

    animationActive = true;
    animationFrameId = requestAnimationFrame(animate);
  });

  onDestroy(() => {
    animationActive = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
</script>

<div class="relative overflow-hidden">
  <div
    bind:this={animationContainer}
    class="flex gap-6 transition-transform duration-0"
  >
    {#each testimonials as testimonial}
      <TestimonialItem {testimonial} />
    {/each}
  </div>
</div>
