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
      },
      {
        value: SubGoalsLayout.TABS,
        icon: "tabs",
        label: "Tabs",
        isDisabled: true,
        badge: "planned"
      },
      {
        value: SubGoalsLayout.BOARDS,
        icon: "ph:columns-light",
        label: "Boards",
        isDisabled: true,
        badge: "planned"
      }
    ]}
    on:select
  />
</div>
