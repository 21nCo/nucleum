<script lang="ts">
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import ColorPickerMini from "@21n/elements/colorPicker/ColorPickerMini.svelte";
  import type { IActiveGoalStore } from "@21n/components/goals/goal.store";
  import {
    AlertType,
    type IInlineStatus
  } from "@21n/types/notification.type";
  import DropDown from "@21n/elements/dropdown/DropDown.svelte";
  import { resolveGoalSubTypesForSwitcher } from "@21n/components/goals/goal.utils";
  import { InputStyle } from "@21n/types/input.type";
  import type { GoalType } from "@21n/components/goals/goal.type";

  let {
    goal,
    control,
    status = $bindable()
  }: {
    goal: IActiveGoalStore;
    control: "color" | "type";
    status?: IInlineStatus | undefined;
  } = $props();

  async function handleColorChange(e: number | string) {
    status = {
      message: "Updating color...",
      type: AlertType.PROGRESS
    };
    const result = await goal.modify({
      color: +e
    });
    if (!result || result.error) {
      status = {
        type: AlertType.ERROR,
        message: "Failed to update goal color"
      };
      return;
    }
    status = {
      message: "Color updated",
      type: AlertType.SUCCESS
    };
  }

  function resolveLabel(control: "color" | "type") {
    if (control === "color") {
      return "Color";
    }
    return "Type";
  }

  async function handleTypeChange(e: CustomEvent<GoalType>) {
    status = {
      message: "Updating type...",
      type: AlertType.PROGRESS
    };
    const result = await goal.modify({
      type: e.detail
    });
    if (!result || result.error) {
      status = {
        type: AlertType.ERROR,
        message: "Failed to update goal type"
      };
      return;
    }
    status = {
      message: "Type updated",
      type: AlertType.SUCCESS
    };
  }
</script>

{#if (control === "color" && !isValidArrayWithData($goal.parent)) || control !== "color"}
  <div
    class="flex flex-col gap-2 border border-brs3 rounded-md px-2 py-1 h-full"
  >
    <span class="text-left text-b2 text-fgs3">{resolveLabel(control)}</span>
    {#if control === "color"}
      <ColorPickerMini
        bind:hue={$goal.color}
        width="w-full"
        onDebouncedChangeCallback={handleColorChange}
      />
    {:else if control === "type"}
      <div class="my-auto">
        <DropDown
          items={resolveGoalSubTypesForSwitcher()}
          value={$goal.type}
          isDisableSearch={true}
          style={InputStyle.PLAIN}
          onSelect={handleTypeChange}
        />
      </div>
    {/if}
  </div>
{/if}
