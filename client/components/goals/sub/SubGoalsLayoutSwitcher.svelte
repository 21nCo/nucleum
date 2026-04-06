<script lang="ts">
  import { SubGoalsLayout } from "@21n/components/goals/goal.type";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { InputStyle } from "@21n/types/input.type";

  let {
    layout = $bindable(undefined),
    onSelect = undefined
  }: {
    layout?: SubGoalsLayout | undefined;
    onSelect?: ((event: CustomEvent<any>) => void) | undefined;
  } = $props();
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
    {onSelect}
  />
</div>
