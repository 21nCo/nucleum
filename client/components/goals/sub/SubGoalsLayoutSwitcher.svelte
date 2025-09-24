<script lang="ts">
  import { SubGoalsLayout } from "../goal.type";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  export let layout: SubGoalsLayout | undefined = undefined;
</script>

<div class="text-fgs3">
  <DropDown
    bind:value={layout}
    popoverWidth="w-40"
    style={InputStyle.PLAIN}
    isDisableSearch={true}
    items={[
      {
        value: SubGoalsLayout.DEFAULT,
        icon: "circle-dashed",
        label: "Default"
      },
      {
        value: SubGoalsLayout.STEPS,
        icon: "ph:steps-light",
        label: "Steps"
      }
    ]}
    on:select
  />
</div>
