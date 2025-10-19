<script lang="ts">
  import type { ITestimonial } from "@21n/landing/shared/landing.type";
  import TestimonialItem from "@21n/landing/shared/testimonials/TestimonialItem.svelte";
  import { onMount, onDestroy } from "svelte";

  export let testimonials: ITestimonial[] = [];
  export let transitionDirection: "left" | "right" = "left";

  let animationContainer: HTMLElement;
  let animationActive = false;
  let isPaused = false;
  /** Speed of animation in pixels per second */
  let animationSpeed = 40;
  let lastTimestamp: number;
  let animationFrameId: number;

  /**
   * Handles the continuous animation of testimonials in an infinite scroll pattern.
   * Calculates proper movement based on elapsed time and manages the illusion of
   * an infinite list by repositioning elements when they move out of view.
   *
   * For left direction:
   * - Moves elements from left to right
   * - When first element moves out of view, it's appended to the end
   *
   * For right direction:
   * - Moves elements from right to left
   * - Pre-emptively moves last element to front before gap would appear
   * - Adjusts position to maintain visual continuity
   *
   * @param timestamp - Current animation frame timestamp provided by requestAnimationFrame
   */
  function animate(timestamp: number) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const elapsed = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (animationActive && animationContainer && !isPaused) {
      const pixelsToMove = (elapsed / 1000) * animationSpeed;
      const movement =
        transitionDirection === "left" ? -pixelsToMove : pixelsToMove;

      const itemWidth = animationContainer.firstElementChild?.clientWidth || 0;
      const gapWidth = 24; // 6 * 4px (gap-6 = 1.5rem = 24px)
      const singleItemTotalWidth = itemWidth + gapWidth;

      const currentPosition = parseFloat(
        animationContainer.style.transform.replace(/[^\d.-]/g, "") || "0"
      );
      let newPosition = currentPosition + movement;

      if (transitionDirection === "right" && newPosition > 0) {
        const lastChild = animationContainer.lastElementChild;
        if (lastChild) {
          animationContainer.style.transition = "none";
          animationContainer.insertBefore(
            lastChild,
            animationContainer.firstElementChild
          );
          newPosition = newPosition - singleItemTotalWidth;
          animationContainer.style.transform = `translateX(${newPosition}px)`;
          void animationContainer.offsetHeight;
          animationContainer.style.transition = "";
        }
      } else {
        animationContainer.style.transform = `translateX(${newPosition}px)`;
      }

      if (
        transitionDirection === "left" &&
        Math.abs(newPosition) >= singleItemTotalWidth
      ) {
        const firstChild = animationContainer.firstElementChild;
        if (firstChild) {
          animationContainer.appendChild(firstChild);
        }
        animationContainer.style.transform = `translateX(${newPosition + singleItemTotalWidth}px)`;
      }
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function handleMouseEnter() {
    isPaused = true;
  }

  function handleMouseLeave() {
    isPaused = false;
  }

  /**
   * Sets up the testimonial carousel animation on component mount.
   * For right-to-left animation, prepares the container by:
   * - Moving items from end to beginning for proper initial positioning
   * - Setting initial negative offset for visual continuity
   * - The offset ensures proper items are in view when animation starts
   *
   * For both directions, starts the animation loop.
   */
  onMount(() => {
    if (transitionDirection === "right") {
      for (let i = 0; i < Math.min(4, testimonials.length); i++) {
        if (animationContainer && animationContainer.lastElementChild) {
          animationContainer.insertBefore(
            animationContainer.lastElementChild,
            animationContainer.firstElementChild
          );
        }
      }
      const itemWidth = animationContainer.firstElementChild?.clientWidth || 0;
      const gapWidth = 24;
      const offset = -(itemWidth + gapWidth) * 3;
      animationContainer.style.transform = `translateX(${offset}px)`;
    }

    animationActive = true;
    animationFrameId = requestAnimationFrame(animate);
  });

  /**
   * Cleans up animation resources when component is destroyed.
   * Stops the animation loop by canceling the animation frame request.
   */
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
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
  >
    {#each testimonials as testimonial}
      <TestimonialItem {testimonial} />
    {/each}
  </div>
</div>
