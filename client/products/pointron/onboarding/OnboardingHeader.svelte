<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import view from "$lib/client/stores/view.store";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { createEventDispatcher } from "svelte";

  //   export let isLastStep = false;
  export let currentStep: number;
  export let totalSteps: number;

  const dispatch = createEventDispatcher();

  function handleBack() {
    dispatch("back");
  }

  function handleSkip() {
    dispatch("skip");
  }

  function handleFinish() {
    dispatch("finish");
  }
</script>

<div class="flex justify-between w-full">
  {#if currentStep > 0}
    {#if $view.isPortrait}
      <Icon on:click={handleBack} icon="chevleft" />
    {:else}
      <Button size={Size.sm} on:click={handleBack} icon="back-sm">Back</Button>
    {/if}
  {/if}
  <!-- {#if !isLastStep} -->
  <div class="ml-auto">
    {#if $view.isPortrait && currentStep > 0}
      {#if currentStep !== totalSteps - 1}
        <Button on:click={handleSkip} style={ButtonStyle.PLAIN}>Skip</Button>
      {:else}
        <Icon on:click={handleFinish} icon="cross" />
      {/if}
    {/if}
  </div>
  <!-- {/if} -->
</div>
