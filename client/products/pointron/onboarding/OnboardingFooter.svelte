<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import view from "$lib/client/stores/view.store";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { createEventDispatcher } from "svelte";

  export let activeStep: number;
  export let totalSteps: number;

  const temp = Array.from({ length: totalSteps - 1 }, (_, i) => i + 1);

  const dispatch = createEventDispatcher();

  function handleNext() {
    dispatch("next");
  }

  function handleStartTutorial() {
    dispatch("final");
  }
</script>

<div
  class={`flex gap-3 w-full flex-col items-center  ${
    $view.isPortrait ? `justify-center mt-auto` : `mr-auto`
  }`}
>
  {#if $view.isPortrait}
    <div class="button mb-4 w-full">
      {#if activeStep !== totalSteps - 1}
        <Button width="w-full" on:click={handleNext} type="primary">
          {#if activeStep === 0}
            Get Started
          {:else}
            Next
          {/if}
        </Button>
      {:else}
        <Button width="w-full" on:click={handleStartTutorial} type="primary">
          Let's go
        </Button>
      {/if}
    </div>
  {/if}
  <div class={`flex gap-3 justify-center`}>
    {#if activeStep > 0 && activeStep !== totalSteps - 1}
      {#each temp as step, index}
        <div
          class={`rounded-full transition-all duration-300 ease-out ${
            $view.isPortrait
              ? activeStep === index + 1
                ? `bg-aps1 w-[0.5rem] h-[0.5rem]`
                : `bg-fgs2 w-[0.5rem] h-[0.5rem]`
              : activeStep === index + 1
                ? `bg-aps1 w-[2.5rem] h-[0.5rem]`
                : `bg-fgs2 w-[0.5rem] h-[0.5rem]`
          }`}
        />
      {/each}
    {/if}
  </div>
</div>

<!-- 
    Note :
    activeStep === index + 1, because since we only want to indicate active step from 1(not 0), also since we only want to show case this indicator after step 0, we are using the above condition activeStep > 0, and reducing the totalSteps by 1, for the same reason we are using index + 1
 -->
